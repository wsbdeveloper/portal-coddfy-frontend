/**
 * Considera inadimplente: parcela não paga (billed === false) e data prevista de pagamento anterior a hoje.
 * Compara apenas a parte da data (UTC) para evitar problemas de fuso.
 */
export function isInstallmentOverdue(installment: {
  billed: boolean;
  expected_payment_date?: string | null;
}): boolean {
  if (installment.billed) return false;
  const raw = installment.expected_payment_date;
  if (!raw || !String(raw).trim()) return false;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return false;

  const endOfDue = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return endOfDue.getTime() < Date.now();
}
