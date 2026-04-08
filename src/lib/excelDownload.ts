import * as XLSX from 'xlsx';

/**
 * Gera um .xlsx a partir de texto (ex.: arquivo salvo como TXT no backend), uma linha por linha na coluna A.
 */
export function downloadTextAsExcel(text: string, fileNameWithoutExt: string) {
  const lines = text.split(/\r?\n/);
  const rows = lines.map((line) => [line]);
  const safeRows = rows.length ? rows : [['']];
  const ws = XLSX.utils.aoa_to_sheet(safeRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
  XLSX.writeFile(wb, `${fileNameWithoutExt}.xlsx`);
}
