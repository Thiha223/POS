import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

function escapeCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportToCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const headerLine = columns.map(c => escapeCell(c.header)).join(',');
  const dataLines = rows.map(row =>
    columns.map(col => escapeCell(col.accessor(row))).join(',')
  );
  const csv = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportToXlsx<T>(filename: string, columns: ExportColumn<T>[], rows: T[], sheetName = 'Sheet1'): void {
  const header = columns.map(c => c.header);
  const data = rows.map(row => columns.map(col => col.accessor(row)));
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToPdf<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 40, 40);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 56);

  const head = [columns.map(c => c.header)];
  const body = rows.map(row => columns.map(col => String(col.accessor(row) ?? '')));

  autoTable(doc, {
    head,
    body,
    startY: 72,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    didDrawPage: () => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, pageWidth - 80, doc.internal.pageSize.getHeight() - 20);
    },
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export function exportData<T>(
  format: ExportFormat,
  baseFilename: string,
  columns: ExportColumn<T>[],
  rows: T[],
  options?: { sheetName?: string; pdfTitle?: string }
): void {
  const filename = `${baseFilename}-${timestamp()}`;
  switch (format) {
    case 'csv':
      return exportToCsv(filename, columns, rows);
    case 'xlsx':
      return exportToXlsx(filename, columns, rows, options?.sheetName);
    case 'pdf':
      return exportToPdf(filename, options?.pdfTitle ?? baseFilename, columns, rows);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
