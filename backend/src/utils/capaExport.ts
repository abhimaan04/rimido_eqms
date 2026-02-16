import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

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
  custom_table?: { rows: number; columns: number; data: string[][] } | null;
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

function hasTableData(table: CapaExportData['custom_table']) {
  if (!table) return false;
  if (!Number.isFinite(table.rows) || !Number.isFinite(table.columns)) return false;
  if (table.rows <= 0 || table.columns <= 0) return false;
  return true;
}

export async function generateCapaFiles(data: CapaExportData) {
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
    const doc = new PDFDocument({ margin: 44 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const margin = 44;
    const contentWidth = pageWidth - margin * 2;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;

    const ensureSpace = (height: number) => {
      if (doc.y + height > pageBottom()) {
        doc.addPage();
        doc.font('Helvetica').fillColor('#111827');
      }
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(28);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text(title, { align: 'left' });
      doc.moveTo(margin, doc.y + 3).lineTo(margin + contentWidth, doc.y + 3).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.6);
      doc.fillColor('#111827');
    };

    const drawKeyValueRow = (label: string, value: string, index: number) => {
      ensureSpace(24);
      const rowY = doc.y;
      if (index % 2 === 0) {
        doc.save().rect(margin, rowY - 2, contentWidth, 22).fill('#f8fafc').restore();
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(label, margin + 8, rowY, { width: 180 });
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text(value || '-', margin + 190, rowY, {
        width: contentWidth - 198,
      });
      doc.y = rowY + 20;
    };

    doc.save().rect(margin, margin, contentWidth, 64).fill('#111827').restore();
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff').text('CAPA Report', margin + 16, margin + 16);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#e5e7eb')
      .text(`Generated ${new Date().toLocaleString()}`, margin + 16, margin + 40);
    doc.moveTo(margin, margin + 78).lineTo(margin + contentWidth, margin + 78).strokeColor('#d1d5db').stroke();
    doc.fillColor('#111827');
    doc.y = margin + 92;

    if (data.approvers && data.approvers.length > 0) {
      drawSectionTitle('Approval');
      const approvalRows = data.approvers.map((a) => formatApprover(a));
      approvalRows.forEach((value, index) => {
        drawKeyValueRow(`Approver ${index + 1}`, value, index);
      });
    }

    drawSectionTitle('CAPA Summary');
    drawKeyValueRow('Title', data.title, 0);
    const summaryDescription = data.description || '-';
    const summaryTextWidth = contentWidth - 16;
    const summaryTextHeight = doc.heightOfString(summaryDescription, { width: summaryTextWidth });
    const summaryBoxHeight = Math.max(48, summaryTextHeight + 10);
    ensureSpace(summaryBoxHeight + 28);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text('Description', margin + 8, doc.y);
    doc.save().rect(margin, doc.y + 14, contentWidth, summaryBoxHeight).strokeColor('#d1d5db').stroke().restore();
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text(summaryDescription, margin + 8, doc.y + 20, {
      width: summaryTextWidth,
    });
    doc.y += summaryBoxHeight + 22;

    if (data.detail_items && data.detail_items.length > 0) {
      drawSectionTitle('CAPA Details');
      data.detail_items.forEach((item, index) => {
        const detailTitle = item.title || '-';
        const detailDescription = item.description || '-';
        const detailTextWidth = contentWidth - 16;
        const detailTextHeight = doc.heightOfString(detailDescription, { width: detailTextWidth });
        const detailBoxHeight = Math.max(44, detailTextHeight + 10);
        const detailContainerHeight = detailBoxHeight + 34;
        ensureSpace(detailContainerHeight + 6);
        doc.save().rect(margin, doc.y - 2, contentWidth, detailContainerHeight).strokeColor('#d1d5db').stroke().restore();
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827')
          .text(`Detail ${index + 1}: ${detailTitle}`, margin + 8, doc.y + 6);
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(detailDescription, margin + 8, doc.y + 24, {
          width: detailTextWidth,
        });
        doc.y += detailContainerHeight;
        if (item.image_paths && item.image_paths.length > 0) {
          item.image_paths.forEach((imgPath) => {
            if (!fs.existsSync(imgPath)) {
              ensureSpace(16);
              doc
                .font('Helvetica-Oblique')
                .fontSize(9)
                .fillColor('#6b7280')
                .text(`Attachment missing: ${path.basename(imgPath)}`, { indent: 10 });
              return;
            }

            ensureSpace(220);
            doc.font('Helvetica-Oblique').fontSize(9).fillColor('#6b7280').text(`Image: ${path.basename(imgPath)}`, {
              indent: 10,
            });
            const imageY = doc.y + 6;
            const imageWidth = contentWidth - 16;
            const imageMaxHeight = 180;
            doc.image(imgPath, margin + 8, imageY, { fit: [imageWidth, imageMaxHeight] });
            doc.y = imageY + imageMaxHeight + 6;
          });
        }
        doc.moveDown(0.6);
      });
    }

    if (hasTableData(data.custom_table)) {
      drawSectionTitle('Custom Table');
      const table = data.custom_table!;
      const columns = Math.max(1, table.columns);
      const cellWidth = contentWidth / columns;
      const rowHeight = 24;
      let y = doc.y;
      const tableRows =
        Array.isArray(table.data) && table.data.length > 0
          ? table.data
          : Array.from({ length: table.rows }, () =>
              Array.from({ length: table.columns }, () => '')
            );

      tableRows.forEach((row, rowIndex) => {
        if (y + rowHeight > pageBottom()) {
          doc.addPage();
          doc.font('Helvetica').fillColor('#111827');
          y = doc.y;
        }
        row.forEach((cell, colIndex) => {
          const x = margin + colIndex * cellWidth;
          if (rowIndex === 0) {
            doc.save().rect(x, y, cellWidth, rowHeight).fillAndStroke('#e2e8f0', '#cbd5e1').restore();
          } else {
            doc.save().rect(x, y, cellWidth, rowHeight).strokeColor('#d1d5db').stroke().restore();
          }
          doc
            .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(9)
            .fillColor('#111827')
            .text(String(cell || ''), x + 4, y + 7, {
              width: cellWidth - 8,
              height: rowHeight - 8,
              ellipsis: true,
            });
        });
        y += rowHeight;
      });
      doc.y = y + 8;
    }

    if (data.custom_fields && data.custom_fields.length > 0) {
      drawSectionTitle('Custom Parameters');
      data.custom_fields.forEach((f, index) => {
        drawKeyValueRow(f.label, f.value || '-', index);
      });
    }

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function generateDocx(filePath: string, data: CapaExportData) {
  const border = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  };

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'CAPA REPORT', bold: true, size: 36, color: '111827' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated ${new Date().toLocaleString()}`, size: 18, color: '6B7280' })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: 'Approval', bold: true, size: 24, color: '1F2937' })],
    }),
  ];

  if (data.approvers && data.approvers.length > 0) {
    const approvalTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: border,
              shading: { fill: 'E2E8F0' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Approver', bold: true })] })],
            }),
          ],
        }),
        ...data.approvers.map(
          (a) =>
            new TableRow({
              children: [
                new TableCell({
                  borders: border,
                  children: [new Paragraph(formatApprover(a))],
                }),
              ],
            })
        ),
      ],
    });
    children.push(approvalTable);
  } else {
    children.push(new Paragraph({ text: 'No approvers listed.' }));
  }

  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'CAPA Summary', bold: true, size: 24, color: '1F2937' })],
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Title: ', bold: true }), new TextRun(data.title || '-')],
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Description: ', bold: true }), new TextRun(data.description || '-')],
    })
  );

  if (data.detail_items && data.detail_items.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'CAPA Details', bold: true, size: 24, color: '1F2937' })],
      })
    );
    data.detail_items.forEach((item, index) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Detail ${index + 1}: ${item.title}`, bold: true, color: '111827' })],
        })
      );
      children.push(new Paragraph({ text: item.description || '-' }));
      if (item.image_paths && item.image_paths.length > 0) {
        item.image_paths.forEach((imgPath) => {
          if (!fs.existsSync(imgPath)) {
            children.push(new Paragraph({ text: `Missing: ${path.basename(imgPath)}` }));
            return;
          }
          const imageBuffer = fs.readFileSync(imgPath);
          children.push(
            new Paragraph({
              children: [new TextRun({ text: path.basename(imgPath), italics: true, color: '6B7280' })],
            })
          );
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 480, height: 320 },
                }),
              ],
            })
          );
        });
      }
    });
  }

  if (hasTableData(data.custom_table)) {
    const tableData = data.custom_table!;
    const tableRows =
      Array.isArray(tableData.data) && tableData.data.length > 0
        ? tableData.data
        : Array.from({ length: tableData.rows }, () =>
            Array.from({ length: tableData.columns }, () => '')
          );
    const wordTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows.map(
        (row, rowIndex) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  borders: border,
                  shading: rowIndex === 0 ? { fill: 'E2E8F0' } : undefined,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: String(cell || ''), bold: rowIndex === 0 })],
                    }),
                  ],
                })
            ),
          })
      ),
    });
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Custom Table', bold: true, size: 24, color: '1F2937' })],
      })
    );
    children.push(wordTable);
  }

  if (data.custom_fields && data.custom_fields.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Custom Parameters', bold: true, size: 24, color: '1F2937' })],
      })
    );
    data.custom_fields.forEach((f) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${f.label}: `, bold: true }),
            new TextRun(f.value || ''),
          ],
        })
      );
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}
