export interface CsvColumn<T> {
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

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
): void {
  const headerLine = columns.map(c => escapeCell(c.header)).join(',');
  const dataLines = rows.map(row =>
    columns.map(col => escapeCell(col.accessor(row))).join(',')
  );

  const csv = [headerLine, ...dataLines].join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
