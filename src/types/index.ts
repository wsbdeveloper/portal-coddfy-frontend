/**
 * Tipos e interfaces TypeScript do sistema
 */

export enum ContractStatus {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  A_VENCER = 'a_vencer',
}

export enum UserRole {
  ADMIN_GLOBAL = 'admin_global',
  ADMIN_PARTNER = 'admin_partner',
  USER_PARTNER = 'user_partner',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  partner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  partner_id?: string | null;
  partner?: Partner;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  contract_id: string;
  month: string;
  value: string;
  billed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Consultant {
  id: string;
  name: string;
  role: string;
  contract_id: string;
  feedback: number;
  performance_color: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  name: string;
  client_id: string;
  total_value: string;
  billed_value: string;
  balance: string;
  status: ContractStatus;
  end_date: string;
  billed_percentage: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  installments?: Installment[];
  consultants?: Consultant[];
}

export interface DashboardStats {
  active_contracts: number;
  inactive_contracts: number;
  allocated_consultants: number;
  average_feedback: number;
  total_contracts_value: string;
  total_billed_value: string;
  total_balance: string;
}

export interface ContractExpiry {
  id: string;
  name: string;
  client_name: string;
  end_date: string;
  days_remaining: number;
  status: string;
}

export interface FinancialSummary {
  total_value: string;
  billed_value: string;
  balance: string;
  billed_percentage: number;
}

export interface DashboardData {
  stats: DashboardStats;
  expiring_contracts: ContractExpiry[];
  financial_summary: FinancialSummary;
}

export interface ConsultantGroup {
  contract_id: string;
  contract_name: string;
  client_name: string;
  total_consultants: number;
  average_feedback: number;
  consultants: Consultant[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Partner {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}















