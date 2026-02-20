/**
 * Utilitários de autenticação e autorização
 */
import { User, UserRole } from '@/types';

/**
 * Obtém o usuário logado do localStorage
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Obtém o partner_id do usuário logado
 */
export function getCurrentUserPartnerId(): string | null {
  const user = getCurrentUser();
  return user?.partner_id || null;
}

/**
 * Obtém o client_id do usuário logado
 */
export function getCurrentUserClientId(): string | null {
  const user = getCurrentUser();
  return user?.client_id || null;
}

/**
 * Verifica se o usuário é do tipo cliente (assignment_type === 'client')
 */
export function isClientUser(): boolean {
  const user = getCurrentUser();
  return user?.assignment_type === 'client';
}

/**
 * Verifica se o usuário é do tipo parceiro (assignment_type === 'partner')
 */
export function isPartnerUser(): boolean {
  const user = getCurrentUser();
  return user?.assignment_type === 'partner';
}

/**
 * Verifica se o usuário é Admin Global
 */
export function isAdminGlobal(): boolean {
  const user = getCurrentUser();
  const role = user?.role as string;
  return role === UserRole.ADMIN_GLOBAL || role === 'admin_global';
}

/**
 * Verifica se o usuário é Admin Partner
 */
export function isAdminPartner(): boolean {
  const user = getCurrentUser();
  const role = user?.role as string;
  return role === UserRole.ADMIN_PARTNER || role === 'admin_partner';
}

/**
 * Verifica se o usuário é Admin (Global ou Partner)
 */
export function isAdmin(): boolean {
  return isAdminGlobal() || isAdminPartner();
}

/**
 * Verifica se o usuário é cliente
 */
export function isClient(): boolean {
  return !isAdmin();
}

/**
 * Filtra dados por partner_id do usuário logado
 * Apenas aplica o filtro se o usuário não for Admin Global
 * @param data Array de objetos que possuem partner_id ou relacionamento com partner
 * @param getPartnerId Função para extrair o partner_id de cada item
 */
export function filterByPartner<T>(
  data: T[],
  getPartnerId: (item: T) => string | null | undefined
): T[] {
  // Admin Global vê todos os dados
  if (isAdminGlobal()) {
    return data;
  }

  const userPartnerId = getCurrentUserPartnerId();
  
  // Se o usuário não tem partner_id, não retorna nada (segurança)
  if (!userPartnerId) {
    console.warn('Usuário sem partner_id tentando acessar dados filtrados');
    return [];
  }

  // Filtrar apenas dados do parceiro do usuário
  return data.filter((item) => {
    const itemPartnerId = getPartnerId(item);
    return itemPartnerId === userPartnerId;
  });
}

/**
 * Filtra contratos por partner_id através do client.partner_id
 * OU por client_id se o usuário for do tipo cliente
 */
export function filterContractsByPartner<T extends { client_id?: string; client?: { partner_id?: string | null; id?: string } }>(
  contracts: T[]
): T[] {
  // Admin Global vê todos os dados
  if (isAdminGlobal()) {
    return contracts;
  }

  // Se o usuário é do tipo cliente, filtrar por client_id
  if (isClientUser()) {
    const userClientId = getCurrentUserClientId();
    if (!userClientId) {
      console.warn('Usuário cliente sem client_id tentando acessar contratos');
      return [];
    }
    return contracts.filter((contract) => {
      return contract.client_id === userClientId || contract.client?.id === userClientId;
    });
  }

  // Se o usuário é do tipo parceiro, filtrar por partner_id
  const userPartnerId = getCurrentUserPartnerId();
  if (!userPartnerId) {
    console.warn('Usuário parceiro sem partner_id tentando acessar contratos');
    return [];
  }

  return contracts.filter((contract) => {
    return contract.client?.partner_id === userPartnerId;
  });
}

