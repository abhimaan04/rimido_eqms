import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';

type CapaExportData = {
  capa_number: string;
  title: string;
  type: string;
  source: string;
  priority: string;
  status: string;
  description: string;
  target_completion_date?: string | null;
  approvers?: Array<string | { name: string; decision?: string | null }> | null;
  custom_fields?: Array<{ label: string; value: string }> | null;
  image_paths?: string[] | null;
  detail_items?: Array<{ title: string; description: string; image_paths?: string[] }> | null;
};

function formatApprover(approver: string | { name: string; decision?: string | null }): string {
  if (typeof approver === 'string') {
    return approver;
  }
  const name = approver?.name || '';
  const decision = approver?.decision ? String(approver.decision).toUpperCase() : '';
  return decision ? `${name} (${decision})` : name;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export async function generateCapaFiles(data: CapaExportData) {
  // Use backend root (works for both src/ and dist/ builds)
  const uploadsDir = path.resolve(__dirname, '../../..', 'uploads', 'capa');
  ensureDir(uploadsDir);

  const baseName = safeFilename(data.capa_number || 'CAPA');
  const pdfPath = path.join(uploadsDir, `${baseName}.pdf`);
  const docxPath = path.join(uploadsDir, `${baseName}.docx`);

  await generatePdf(pdfPath, data);
  await generateDocx(docxPath, data);

  return { pdfPath, docxPath };
}

async function generatePdf(filePath: string, data: CapaExportData) {
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('CAPA Record', { underline: true });
    doc.moveDown(0.5);

    const rows: Array<[string, string]> = [
      ['CAPA Number', data.capa_number],
      ['Title', data.title],
      ['Type', data.type],
      ['Source', data.source],
      ['Priority', data.priority],
      ['Status', data.status],
      ['Target Completion Date', data.target_completion_date || ''],
    ];

    rows.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, { continued: true });
      doc.font('Helvetica').fontSize(11).text(value || '');
    });

    doc.moveDown();
    doc.fontSize(12).text('Description', { underline: true });
    doc.fontSize(11).text(data.description || '');

    if (data.approvers && data.approvers.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text('Approvers', { underline: true });
      data.approvers.forEach((a) => doc.fontSize(11).text(`- ${formatApprover(a)}`));
    }

    if (data.custom_fields && data.custom_fields.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text('Custom Parameters', { underline: true });
      data.custom_fields.forEach((f) => {
        doc.font('Helvetica-Bold').fontSize(11).text(`${f.label}: `, { continued: true });
        doc.font('Helvetica').fontSize(11).text(f.value || '');
      });
    }

    if (data.detail_items && data.detail_items.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text('CAPA Details', { underline: true });
      data.detail_items.forEach((item, index) => {
        doc.moveDown(0.25);
        doc.font('Helvetica-Bold').fontSize(11).text(`Detail ${index + 1}: ${item.title}`);
        doc.font('Helvetica').fontSize(11).text(item.description || '');
        if (item.image_paths && item.image_paths.length > 0) {
          item.image_paths.forEach((imgPath) => {
            doc.font('Helvetica').fontSize(10).text(`  - ${path.basename(imgPath)}`);
          });
        }
      });
    }

    if (data.image_paths && data.image_paths.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text('Image Attachments', { underline: true });
      data.image_paths.forEach((imgPath) => {
        doc.font('Helvetica').fontSize(11).text(`- ${path.basename(imgPath)}`);
      });
    }

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function generateDocx(filePath: string, data: CapaExportData) {
  const rows: Array<[string, string]> = [
    ['CAPA Number', data.capa_number],
    ['Title', data.title],
    ['Type', data.type],
    ['Source', data.source],
    ['Priority', data.priority],
    ['Status', data.status],
    ['Target Completion Date', data.target_completion_date || ''],
  ];

  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'CAPA Record', bold: true, size: 32 })],
    }),
    new Paragraph({ text: '' }),
    ...rows.map(
      ([label, value]) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun(value || ''),
          ],
        })
    ),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: 'Description', bold: true })],
    }),
    new Paragraph({ text: data.description || '' }),
  ];

  if (data.approvers && data.approvers.length > 0) {
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Approvers', bold: true })],
      })
    );
    data.approvers.forEach((a) => {
      paragraphs.push(new Paragraph({ text: `- ${formatApprover(a)}` }));
    });
  }

  if (data.custom_fields && data.custom_fields.length > 0) {
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Custom Parameters', bold: true })],
      })
    );
    data.custom_fields.forEach((f) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${f.label}: `, bold: true }),
            new TextRun(f.value || ''),
          ],
        })
      );
    });
  }

  if (data.detail_items && data.detail_items.length > 0) {
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'CAPA Details', bold: true })],
      })
    );
    data.detail_items.forEach((item, index) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `Detail ${index + 1}: ${item.title}`, bold: true })],
        })
      );
      paragraphs.push(new Paragraph({ text: item.description || '' }));
      if (item.image_paths && item.image_paths.length > 0) {
        item.image_paths.forEach((imgPath) => {
          paragraphs.push(new Paragraph({ text: `- ${path.basename(imgPath)}` }));
        });
      }
    });
  }

  if (data.image_paths && data.image_paths.length > 0) {
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Image Attachments', bold: true })],
      })
    );
    data.image_paths.forEach((imgPath) => {
      paragraphs.push(new Paragraph({ text: `- ${path.basename(imgPath)}` }));
    });
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}
