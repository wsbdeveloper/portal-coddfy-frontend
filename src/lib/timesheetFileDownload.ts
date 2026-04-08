import { downloadTextAsExcel } from '@/lib/excelDownload';

const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:6543/api';

function dateStrForFileName(timesheet: {
  approval_date?: string | null;
  created_at?: string | null;
}): string {
  const raw = timesheet.approval_date || timesheet.created_at;
  const d = raw ? new Date(raw) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Baixa o arquivo do timesheet. Se vier como texto, gera um .xlsx para abrir no Excel.
 */
export async function downloadTimesheetAsExcel(timesheet: {
  id: string;
  approval_date?: string | null;
  created_at?: string | null;
}): Promise<void> {
  const token = localStorage.getItem('token');
  const fileUrl = `${API_URL}/timesheets/${timesheet.id}/file`;
  const response = await fetch(fileUrl, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Erro ao baixar arquivo' }));
    throw new Error((errData as { error?: string }).error || 'Erro ao baixar arquivo');
  }

  const blob = await response.blob();
  const contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const baseName = `timesheets_${dateStrForFileName(timesheet)}`;

  const isSpreadsheet =
    contentType.includes('spreadsheet') ||
    contentType.includes('excel') ||
    contentType === 'application/vnd.ms-excel';

  if (isSpreadsheet) {
    const extension =
      contentType.includes('openxml') || contentType.includes('spreadsheetml')
        ? 'xlsx'
        : contentType.includes('ms-excel')
          ? 'xls'
          : 'xlsx';
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 500);
    return;
  }

  const text = await blob.text();
  downloadTextAsExcel(text, baseName);
}
