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
  assignment_type?: 'partner' | 'client' | 'internal';
  client_id?: string | null;
  client?: Client;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  partner_id?: string | null;
  partner?: Partner;
  is_active?: boolean;
  cnpj?: string | null;
  razao_social?: string | null;
  /** Logo ou foto do cliente (URL retornada pela API) */
  photo_url?: string | null;
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
  invoice_number?: string | null;
  billing_date?: string | null;
  payment_term?: string | null;
  expected_payment_date?: string | null;
  payment_date?: string | null;
}

export interface FeedbackHistoryItem {
  id?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Consultant {
  id: string;
  name: string;
  role: string;
  contract_id: string;
  feedback: number;
  performance_color: string;
  last_feedback_comment?: string;
  feedback_history?: FeedbackHistoryItem[];
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

/** Valores enviados à API (contrato) */
export type ContractTypeCode =
  | 'body_shop_recorrente'
  | 'time_material'
  | 'projeto';

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
  responsible_name?: string | null;
  payment_method?: string | null;
  contract_type?: string | null;
  /** API */
  estimated_monthly_hours?: string | number | null;
  duration_months?: string | number | null;
  /** Legado / alias */
  monthly_hours_estimated?: string | number | null;
  contract_months_count?: string | number | null;
  total_hours_contracted?: string | number | null;
  installment_amount?: string | null;
  installments_count?: string | number | null;
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
  /** Parcelas com payment_date (API) */
  paid_value?: string;
  /** Parcelas com billing_date e sem payment_date */
  pending_payment?: string;
  pending_payment_value?: string;
  /** max(0, total - paid - pending) — preferir quando a API enviar */
  to_bill?: string;
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
  is_strategic?: boolean;
  /** URL ou path do logo (API) */
  logo_url?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Timesheet {
  id: string;
  contract_id: string;
  consultant_id?: string | null;
  file_url?: string | null;
  hours?: number | null;
  approver?: string | null;
  approval_date?: string | null;
  filled_at?: string | null;
  uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
  contract?: Contract;
  consultant?: Consultant;
}















