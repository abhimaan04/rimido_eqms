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
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;

    const ensureSpace = (height: number) => {
      if (doc.y + height > pageBottom()) {
        doc.addPage();
        doc.font('Helvetica').fillColor('#111827');
      }
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(35);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1F2937').text(title, { align: 'left' });
      doc.moveTo(margin, doc.y + 4).lineTo(margin + contentWidth, doc.y + 4).strokeColor('#3B82F6').lineWidth(2).stroke();
      doc.moveDown(0.8);
      doc.fillColor('#111827');
    };

    const drawKeyValueRow = (label: string, value: string, index: number) => {
      ensureSpace(26);
      const rowY = doc.y;
      if (index % 2 === 0) {
        doc.save().rect(margin, rowY - 2, contentWidth, 24).fill('#F9FAFB').restore();
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(label, margin + 10, rowY, { width: 200 });
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text(value || '-', margin + 220, rowY, {
        width: contentWidth - 230,
      });
      doc.y = rowY + 22;
    };

    // Header with improved design
    doc.save().rect(margin, margin, contentWidth, 80).fill('#1E40AF').restore();
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF').text('CAPA REPORT', margin + 20, margin + 20);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#E0E7FF')
      .text(`CAPA Number: ${data.capa_number || 'N/A'}`, margin + 20, margin + 50);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#C7D2FE')
      .text(`Generated: ${new Date().toLocaleString()}`, margin + 20, margin + 65);
    doc.moveTo(margin, margin + 95).lineTo(margin + contentWidth, margin + 95).strokeColor('#3B82F6').lineWidth(1).stroke();
    doc.fillColor('#111827');
    doc.y = margin + 110;

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
    const summaryTextWidth = contentWidth - 20;
    const summaryTextHeight = doc.heightOfString(summaryDescription, { width: summaryTextWidth });
    const summaryBoxHeight = Math.max(60, summaryTextHeight + 20);
    ensureSpace(summaryBoxHeight + 35);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151').text('Description', margin + 10, doc.y);
    doc.save()
      .rect(margin, doc.y + 16, contentWidth, summaryBoxHeight)
      .fill('#FFFFFF')
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke()
      .restore();
    doc.font('Helvetica').fontSize(10).fillColor('#111827').text(summaryDescription, margin + 12, doc.y + 22, {
      width: summaryTextWidth,
      lineGap: 2,
    });
    doc.y += summaryBoxHeight + 28;

    if (data.detail_items && data.detail_items.length > 0) {
      drawSectionTitle('CAPA Details');
      data.detail_items.forEach((item, index) => {
        const detailTitle = item.title || '-';
        const detailDescription = item.description || '-';
        const detailTextWidth = contentWidth - 20;
        const detailTextHeight = doc.heightOfString(detailDescription, { width: detailTextWidth });
        const detailBoxHeight = Math.max(50, detailTextHeight + 15);
        const detailContainerHeight = detailBoxHeight + 40;
        ensureSpace(detailContainerHeight + 10);
        
        // Detail box with improved styling
        doc.save()
          .rect(margin, doc.y - 2, contentWidth, detailContainerHeight)
          .fill('#FAFBFC')
          .strokeColor('#D1D5DB')
          .lineWidth(1)
          .stroke()
          .restore();
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E40AF').text(`Detail ${index + 1}: ${detailTitle}`, margin + 10, doc.y + 8);
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(detailDescription, margin + 10, doc.y + 26, {
          width: detailTextWidth,
          lineGap: 2,
        });
        doc.y += detailContainerHeight - 8;
        
        // Handle images with better layout
        if (item.image_paths && item.image_paths.length > 0) {
          item.image_paths.forEach((imgPath, imgIndex) => {
            const resolvedPath = path.isAbsolute(imgPath) ? imgPath : path.resolve(__dirname, '../../..', imgPath);
            
            if (!fs.existsSync(resolvedPath)) {
              ensureSpace(20);
              doc
                .font('Helvetica-Oblique')
                .fontSize(9)
                .fillColor('#9CA3AF')
                .text(`Image ${imgIndex + 1} missing: ${path.basename(imgPath)}`, margin + 10);
              doc.y += 16;
              return;
            }

            try {
              ensureSpace(250);
              doc.font('Helvetica-Oblique').fontSize(9).fillColor('#6B7280').text(`Image ${imgIndex + 1}: ${path.basename(imgPath)}`, margin + 10);
              const imageY = doc.y + 8;
              const imageWidth = contentWidth - 20;
              const imageMaxHeight = 200;
              
              // Store Y position before image
              const beforeImageY = doc.y;
              doc.image(resolvedPath, margin + 10, imageY, { 
                fit: [imageWidth, imageMaxHeight],
                align: 'center',
              });
              
              // Calculate approximate height (PDFKit doesn't return image dimensions)
              // Use max height as safe estimate, actual will be less if image is smaller
              doc.y = imageY + imageMaxHeight + 12;
            } catch (imgError) {
              ensureSpace(20);
              doc
                .font('Helvetica-Oblique')
                .fontSize(9)
                .fillColor('#EF4444')
                .text(`Error loading image ${imgIndex + 1}: ${path.basename(imgPath)}`, margin + 10);
              doc.y += 16;
            }
          });
        }
        doc.moveDown(0.8);
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
      spacing: { after: 200 },
      children: [
        new TextRun({ 
          text: 'CAPA REPORT', 
          bold: true, 
          size: 44, 
          color: '1E40AF',
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ 
          text: `CAPA Number: ${data.capa_number || 'N/A'}`, 
          size: 20, 
          color: '374151',
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ 
          text: `Generated: ${new Date().toLocaleString()}`, 
          size: 18, 
          color: '6B7280',
          italics: true,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ 
          text: 'Approval', 
          bold: true, 
          size: 28, 
          color: '1F2937',
          font: 'Arial',
        }),
      ],
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
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 3, color: '3B82F6' },
      },
      children: [
        new TextRun({ 
          text: 'CAPA Summary', 
          bold: true, 
          size: 28, 
          color: '1F2937',
          font: 'Arial',
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Title: ', bold: true, size: 22, color: '374151' }), 
        new TextRun({ text: data.title || '-', size: 22 }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'Description: ', bold: true, size: 22, color: '374151' }), 
        new TextRun({ text: data.description || '-', size: 22 }),
      ],
    })
  );

  if (data.detail_items && data.detail_items.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 3, color: '3B82F6' },
        },
        children: [
          new TextRun({ 
            text: 'CAPA Details', 
            bold: true, 
            size: 28, 
            color: '1F2937',
            font: 'Arial',
          }),
        ],
      })
    );
    data.detail_items.forEach((item, index) => {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          shading: { fill: 'F9FAFB' },
          children: [
            new TextRun({ 
              text: `Detail ${index + 1}: ${item.title}`, 
              bold: true, 
              size: 24, 
              color: '1E40AF',
              font: 'Arial',
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: item.description || '-', size: 22 }),
          ],
        })
      );
      
      if (item.image_paths && item.image_paths.length > 0) {
        item.image_paths.forEach((imgPath, imgIndex) => {
          const resolvedPath = path.isAbsolute(imgPath) ? imgPath : path.resolve(__dirname, '../../..', imgPath);
          
          if (!fs.existsSync(resolvedPath)) {
            children.push(
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ 
                    text: `Image ${imgIndex + 1} missing: ${path.basename(imgPath)}`, 
                    italics: true, 
                    color: '9CA3AF',
                    size: 18,
                  }),
                ],
              })
            );
            return;
          }
          
          try {
            const imageBuffer = fs.readFileSync(resolvedPath);
            children.push(
              new Paragraph({
                spacing: { before: 100, after: 50 },
                children: [
                  new TextRun({ 
                    text: `Image ${imgIndex + 1}: ${path.basename(imgPath)}`, 
                    italics: true, 
                    color: '6B7280',
                    size: 18,
                  }),
                ],
              })
            );
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: { width: 500, height: 350 },
                  }),
                ],
              })
            );
          } catch (imgError) {
            children.push(
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ 
                    text: `Error loading image ${imgIndex + 1}: ${path.basename(imgPath)}`, 
                    color: 'EF4444',
                    size: 18,
                  }),
                ],
              })
            );
          }
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
        spacing: { before: 300, after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 3, color: '3B82F6' },
        },
        children: [
          new TextRun({ 
            text: 'Custom Table', 
            bold: true, 
            size: 28, 
            color: '1F2937',
            font: 'Arial',
          }),
        ],
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
