import type { Contract, Installment } from '@/types';

export interface ContractFinancialBreakdown {
  total: number;
  billedPaid: number;
  billedPending: number;
  toBill: number;
}

function installmentIsPaid(inst: Installment): boolean {
  const pd = inst.payment_date;
  return pd != null && String(pd).trim() !== '';
}

/** Faturado e ainda sem pagamento (billing_date e sem payment_date; ou legado billed sem payment_date). */
function installmentIsPendingPayment(inst: Installment): boolean {
  if (installmentIsPaid(inst)) return false;
  const bd = inst.billing_date;
  if (bd != null && String(bd).trim() !== '') return true;
  if (inst.billed === true) return true;
  return false;
}

/**
 * Valores no card do contrato: pago (payment_date ou billed legado), pendente (faturado sem pagamento), a faturar.
 */
export function getContractFinancialBreakdown(contract: Contract): ContractFinancialBreakdown {
  const total = parseFloat(contract.total_value) || 0;
  const installments = contract.installments;

  if (installments && installments.length > 0) {
    let billedPaid = 0;
    let billedPending = 0;
    for (const inst of installments) {
      const v = parseFloat(inst.value) || 0;
      if (installmentIsPaid(inst)) billedPaid += v;
      else if (installmentIsPendingPayment(inst)) billedPending += v;
    }
    const toBill = Math.max(0, total - billedPaid - billedPending);
    return { total, billedPaid, billedPending, toBill };
  }

  const billedPaid = parseFloat(contract.billed_value) || 0;
  const billedPending = 0;
  const toBill = Math.max(0, parseFloat(contract.balance) || 0);
  return { total, billedPaid, billedPending, toBill };
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return '—';
  const m: Record<string, string> = {
    a_vista: 'À vista',
    parcelado: 'Parcelado',
  };
  return m[method] || method;
}

export function contractTypeLabel(type?: string | null): string {
  if (!type) return '—';
  const t: Record<string, string> = {
    body_shop_recorrente: 'Body Shop - Recorrente',
    body_shop_recurrent: 'Body Shop - Recorrente',
    time_material: 'Time & Material',
    projeto: 'Projeto',
    project: 'Projeto',
  };
  return t[type] || type;
}
