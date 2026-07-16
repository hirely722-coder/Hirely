export interface ExportColumn<T> {
  header: string;
  key: keyof T | string;
  transform?: (value: any, record: T) => string | number | boolean | null | undefined;
}

/**
 * Utility to generate a CSV file client-side and trigger download.
 * Conforms to RFC 4180 rules for escaping commas, double quotes, and newlines.
 */
export function generateCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  // Extract headers
  const headers = columns.map(col => col.header);

  // Format rows
  const rows = data.map(record => {
    return columns.map(col => {
      let value: any;
      if (col.transform) {
        value = col.transform(record[col.key as keyof T], record);
      } else {
        value = record[col.key as keyof T];
      }

      // Normalize value to string
      const strValue = value === null || value === undefined ? '' : String(value);

      // Escape double quotes and wrap in quotes
      const escaped = strValue.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // Combine headers and rows
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows
  ].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
