/**
 * Regras de UI para exibir "Redefinir senha" (alinhado ao backend).
 * actor/target usam role como string (enum ou valor da API).
 */

export type PasswordResetActor = {
  id: string;
  role: string;
  partner_id?: string | null;
};

export type PasswordResetTarget = {
  id: string;
  role: string;
  partner_id?: string | null;
};

function normRole(role: string): string {
  return String(role || '').toLowerCase();
}

export function canShowResetPassword(
  actor: PasswordResetActor | null | undefined,
  target: PasswordResetTarget | null | undefined
): boolean {
  if (!actor?.id || !target?.id) return false;
  const ar = normRole(actor.role);
  if (ar !== 'admin_global' && ar !== 'admin_partner') return false;
  if (target.id === actor.id) return false;
  const tr = normRole(target.role);
  if (tr === 'admin_global') return false;
  if (ar === 'admin_partner') {
    if (tr === 'admin_partner') return false;
    const ap = actor.partner_id ?? null;
    const tp = target.partner_id ?? null;
    if (ap == null || tp == null || ap !== tp) return false;
  }
  return true;
}
