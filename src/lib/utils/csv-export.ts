/**
 * Utility functions for CSV export
 */

export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function generateCSV(data: any[], columns: CSVColumn[]): string {
  const lines: string[] = [];
  
  // Add header row
  const headers = columns.map(col => `"${col.label}"`);
  lines.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      let value = row[col.key];
      
      // Apply formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value);
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    
    lines.push(values.join(','));
  });
  
  return lines.join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (typeof num !== 'number') return '';
  return num.toFixed(decimals);
}

export function formatPercentage(num: number, decimals: number = 1): string {
  if (typeof num !== 'number') return '';
  return `${num.toFixed(decimals)}%`;
}