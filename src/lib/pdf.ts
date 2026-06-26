import type { TrackerModel } from '../types';
import type { jsPDF as JsPDFDocument } from 'jspdf';

function fitText(doc: JsPDFDocument, value: string, maxWidth: number): string {
  if (doc.getTextWidth(value) <= maxWidth) {
    return value;
  }

  let trimmed = value;
  while (doc.getTextWidth(`${trimmed}...`) > maxWidth && trimmed.length > 1) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

export async function generateTrackerPdf(model: TrackerModel): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const columns = model.columns;
  const rows = model.rows;
  const landscape = columns.length > 12;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = landscape ? 297 : 210;
  const pageHeight = landscape ? 210 : 297;
  const marginX = 16;
  const marginY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(31, 28, 24);
  doc.text(model.titleText, marginX, marginY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(140, 134, 124);
  doc.text(model.rangeText, marginX, marginY + 6.5);

  doc.setDrawColor(43, 40, 35);
  doc.setLineWidth(0.5);
  doc.line(marginX, marginY + 11, pageWidth - marginX, marginY + 11);

  const tableTop = marginY + 18;
  const tableWidth = pageWidth - marginX * 2;
  const nameWidth = Math.min(56, tableWidth * 0.3);
  const cellWidth = (tableWidth - nameWidth) / columns.length;
  const headerHeight = 9;
  const rowHeight = Math.min(
    17,
    Math.max(10, (pageHeight - tableTop - headerHeight - 22) / Math.max(1, rows.length)),
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 145, 135);
  doc.text(model.colHabit.toUpperCase(), marginX + 1, tableTop + headerHeight - 3);

  doc.setFontSize(columns.length > 16 ? 7 : 9);
  columns.forEach((column, index) => {
    const x = marginX + nameWidth + index * cellWidth;
    doc.text(column.label, x + cellWidth / 2, tableTop + headerHeight - 3, { align: 'center' });
  });

  doc.setDrawColor(190, 184, 174);
  doc.setLineWidth(0.3);
  doc.line(marginX, tableTop + headerHeight, marginX + tableWidth, tableTop + headerHeight);

  rows.forEach((row, rowIndex) => {
    const rowY = tableTop + headerHeight + rowIndex * rowHeight;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40, 38, 33);
    doc.text(fitText(doc, row.name, nameWidth - 3), marginX + 1, rowY + rowHeight / 2 + 1.8);

    row.cells.forEach((cell, columnIndex) => {
      if (!cell.active) {
        return;
      }

      const cellX = marginX + nameWidth + columnIndex * cellWidth;
      const size = Math.min(cellWidth, rowHeight) * 0.5;
      const squareX = cellX + (cellWidth - size) / 2;
      const squareY = rowY + (rowHeight - size) / 2;

      doc.setDrawColor(120, 116, 108);
      doc.setLineWidth(0.3);
      doc.roundedRect(squareX, squareY, size, size, 0.8, 0.8, 'S');
    });

    doc.setDrawColor(232, 228, 221);
    doc.setLineWidth(0.15);
    doc.line(marginX, rowY + rowHeight, marginX + tableWidth, rowY + rowHeight);
  });

  const gridBottom = tableTop + headerHeight + rows.length * rowHeight;
  doc.setDrawColor(238, 235, 229);
  doc.setLineWidth(0.12);

  for (let index = 0; index <= columns.length; index += 1) {
    const x = marginX + nameWidth + index * cellWidth;
    doc.line(x, tableTop + headerHeight, x, gridBottom);
  }

  doc.line(marginX, tableTop + headerHeight, marginX, gridBottom);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(175, 170, 160);
  doc.text(model.footer, marginX, pageHeight - 10);

  doc.save('habit-tracker.pdf');
}
