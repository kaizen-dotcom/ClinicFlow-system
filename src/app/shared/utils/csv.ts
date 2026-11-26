/** Downloads rows as a CSV file (first row = headers). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v);
    // Spreadsheets run cells starting with = + - @ as formulas, and these values are typed by users.
    // Plain numbers and phone numbers are left as they are.
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?[\d ().-]+$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
