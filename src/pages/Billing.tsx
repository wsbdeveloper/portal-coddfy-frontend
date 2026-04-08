/**
 * Página de Faturamento
 * Gestão completa de parcelas e análise financeira
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { getCurrentUser, isClientUser, getCurrentUserClientId, isAdminGlobal } from '@/lib/auth';
import { UserRole } from '@/types';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import CreateInstallmentDialog from '@/components/CreateInstallmentDialog';
import { isInstallmentOverdue } from '@/lib/installmentOverdue';

interface Installment {
  id: string;
  contract_id: string;
  month: string;
  value: string;
  billed: boolean;
  created_at: string;
  invoice_number?: string | null;
  billing_date?: string | null;
  payment_term?: string | null;
  expected_payment_date?: string | null;
  payment_date?: string | null;
  contract?: {
    id: string;
    name: string;
    client: {
      name: string;
    };
  };
}

interface BillingSummary {
  total_billed: number;
  total_pending: number;
  total: number;
  count_billed: number;
  count_pending: number;
  percentage_billed: number;
  contracts: Array<{
    contract_id: string;
    contract_name: string;
    total_installments: number;
    total_value: number;
    billed_value: number;
    pending_value: number;
  }>;
}

export default function Billing() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [expandedInstallments, setExpandedInstallments] = useState<Set<string>>(new Set());
  const [showOverdue, setShowOverdue] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<Installment | null>(null);

  const overdueInstallments = useMemo(
    () => installments.filter((i) => isInstallmentOverdue(i)),
    [installments]
  );

  // Verificar se é cliente
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isClient = user?.role !== UserRole.ADMIN_GLOBAL && 
                   user?.role !== 'admin_global';

  // Filtros
  const [filterBilled, setFilterBilled] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [filterBilled, filterMonth, filterYear]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Busca parcelas com filtros
      const params = new URLSearchParams();
      if (filterBilled !== 'all') {
        params.append('billed', filterBilled);
      }
      if (filterMonth) {
        params.append('month', filterMonth);
      }
      if (filterYear) {
        params.append('year', filterYear);
      }

      const [installmentsRes, summaryRes] = await Promise.all([
        api.get(`/installments?${params.toString()}`),
        api.get('/installments/summary'),
      ]);

      const allInstallments = installmentsRes.data.installments || [];
      // Aplicar filtro de segurança por partner_id ou client_id
      // Como Installment não tem essas informações diretamente, precisamos buscar os contratos
      let filteredInstallments = allInstallments;
      
      if (!isAdminGlobal()) {
        try {
          const contractsRes = await api.get('/contracts');
          const contracts = contractsRes.data?.contracts || [];
          const contractMap = new Map<string, any>();
          contracts.forEach((contract: any) => {
            contractMap.set(contract.id, contract);
          });
          
          const currentUser = getCurrentUser();
          
          // Se o usuário é do tipo cliente, filtrar por client_id
          if (isClientUser()) {
            const userClientId = getCurrentUserClientId();
            if (userClientId) {
              filteredInstallments = allInstallments.filter((installment: Installment) => {
                const contract = contractMap.get(installment.contract_id);
                return contract?.client_id === userClientId || contract?.client?.id === userClientId;
              });
            } else {
              filteredInstallments = [];
            }
          } else {
            // Se o usuário é do tipo parceiro, filtrar por partner_id
            const userPartnerId = currentUser?.partner_id;
            if (userPartnerId) {
              filteredInstallments = allInstallments.filter((installment: Installment) => {
                const contract = contractMap.get(installment.contract_id);
                return contract?.client?.partner_id === userPartnerId;
              });
            } else {
              filteredInstallments = [];
            }
          }
        } catch (contractErr) {
          console.warn('Erro ao buscar contratos para filtro de segurança:', contractErr);
          // Se falhar, manter todos (backend deve filtrar)
        }
      }
      
      setInstallments(filteredInstallments);
      
      // Filtrar também o summary por partner_id ou client_id
      const summaryData = summaryRes.data;
      if (summaryData && !isAdminGlobal()) {
        // Filtrar contratos no summary
        if (summaryData.contracts) {
          try {
            const contractsRes = await api.get('/contracts');
            const contracts = contractsRes.data?.contracts || [];
            const contractMap = new Map<string, any>();
            contracts.forEach((contract: any) => {
              contractMap.set(contract.id, contract);
            });
            
            const currentUser = getCurrentUser();
            
            if (isClientUser()) {
              const userClientId = getCurrentUserClientId();
              if (userClientId) {
                summaryData.contracts = summaryData.contracts.filter((summaryContract: any) => {
                  const contract = contractMap.get(summaryContract.contract_id);
                  return contract?.client_id === userClientId || contract?.client?.id === userClientId;
                });
              } else {
                summaryData.contracts = [];
              }
            } else {
              const userPartnerId = currentUser?.partner_id;
              if (userPartnerId) {
                summaryData.contracts = summaryData.contracts.filter((summaryContract: any) => {
                  const contract = contractMap.get(summaryContract.contract_id);
                  return contract?.client?.partner_id === userPartnerId;
                });
              } else {
                summaryData.contracts = [];
              }
            }
          } catch (contractErr) {
            console.warn('Erro ao buscar contratos para filtro do summary:', contractErr);
          }
        }
      }
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados de faturamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkBilled = async (id: string, billed: boolean) => {
    try {
      await api.patch(`/installments/${id}/mark-billed`, { billed });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar parcela');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta parcela?')) return;

    try {
      await api.delete(`/installments/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir parcela');
    }
  };

  const clearFilters = () => {
    setFilterBilled('all');
    setFilterMonth('');
    setFilterYear('');
  };

  const toggleContract = (contractId: string) => {
    const newExpanded = new Set(expandedContracts);
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId);
    } else {
      newExpanded.add(contractId);
    }
    setExpandedContracts(newExpanded);
  };

  const toggleInstallment = (installmentId: string) => {
    const newExpanded = new Set(expandedInstallments);
    if (newExpanded.has(installmentId)) {
      newExpanded.delete(installmentId);
    } else {
      newExpanded.add(installmentId);
    }
    setExpandedInstallments(newExpanded);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') {
        // Gerar CSV
        const csvContent = [
          ['Mês', 'Contrato', 'Cliente', 'Valor', 'Status', 'Data Criação'].join(','),
          ...installments.map(i => [
            i.month,
            i.contract?.name || 'N/A',
            i.contract?.client?.name || 'N/A',
            i.value,
            i.billed ? 'Pago' : 'Pendente',
            formatDate(i.created_at)
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `faturamento_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        // Para PDF, usar window.print() ou uma biblioteca de PDF
        window.print();
      }
    } catch (err) {
      alert('Erro ao exportar dados');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-muted-foreground">
            Gerencie parcelas e acompanhe o fluxo financeiro
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          {!isClient && (
            <Button
              onClick={() => {
                setInstallmentToEdit(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Parcela
            </Button>
          )}
        </div>
      </div>

      <CreateInstallmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setInstallmentToEdit(null);
        }}
        onSuccess={fetchData}
        installmentToEdit={installmentToEdit}
      />

      {/* KPIs de Resumo */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturado e Pago
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.total_billed)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.count_billed} parcela(s) paga(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturado e Pendente Pagamento
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.total_pending)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.count_pending} parcela(s) pendente(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.count_billed + summary.count_pending} parcela(s) total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                % Faturado e Pago
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.percentage_billed.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                do valor total de parcelas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quadro de Inadimplentes (apenas visão interna) */}
      {!isClient && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle>Valores Inadimplentes</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOverdue(!showOverdue)}
              >
                {showOverdue ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
            <CardDescription>
              Faturas geradas e não pagas com data de pagamento limite vencida
            </CardDescription>
          </CardHeader>
          {showOverdue && (
            <CardContent>
              <div className="space-y-3">
                {overdueInstallments.length > 0 ? (
                  overdueInstallments.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg bg-red-50">
                      <p className="font-medium">{item.contract?.name || '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {item.contract?.client?.name || '—'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mês: {item.month}
                        {item.expected_payment_date
                          ? ` · Vencimento: ${formatDate(item.expected_payment_date)}`
                          : ''}
                      </p>
                      <p className="text-sm font-medium text-red-600 mt-1">
                        Valor: {formatCurrency(parseFloat(item.value))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum valor inadimplente encontrado
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Resumo por Contrato */}
      {summary && summary.contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Contrato</CardTitle>
            <CardDescription>
              Visão consolidada de parcelas por contrato ativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.contracts.map((contract) => {
                const isExpanded = expandedContracts.has(contract.contract_id);
                const contractInstallments = installments.filter(
                  i => i.contract_id === contract.contract_id
                );
                return (
                  <div key={contract.contract_id}>
                    <div
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50"
                      onClick={() => toggleContract(contract.contract_id)}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{contract.contract_name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleContract(contract.contract_id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {contract.total_installments} parcela(s)
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Faturado e Pago</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(contract.billed_value)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Faturado e Pendente Pagto</p>
                            <p className="font-medium text-orange-600">
                              {formatCurrency(contract.pending_value)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Faturado</p>
                            <p className="font-medium">
                              {formatCurrency(contract.total_value)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && contractInstallments.length > 0 && (
                      <div className="mt-2 ml-4 space-y-2">
                        {contractInstallments.map((installment) => {
                          const isInstallmentExpanded = expandedInstallments.has(installment.id);
                          return (
                            <div key={installment.id} className="border rounded-lg p-3 bg-muted/50">
                              <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleInstallment(installment.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{installment.month}</span>
                                  <Badge variant={installment.billed ? 'default' : 'secondary'}>
                                    {installment.billed ? 'Pago' : 'Pendente'}
                                  </Badge>
                                  <span className="font-bold">
                                    {formatCurrency(parseFloat(installment.value))}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleInstallment(installment.id);
                                  }}
                                >
                                  {isInstallmentExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {isInstallmentExpanded && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                  <div className="grid gap-2 md:grid-cols-2">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Número da Nota Fiscal</p>
                                      <p className="text-sm font-medium">
                                        {installment.invoice_number?.trim() || '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data de Faturamento</p>
                                      <p className="text-sm font-medium">
                                        {installment.billing_date
                                          ? formatDate(installment.billing_date)
                                          : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Prazo de Pagamento</p>
                                      <p className="text-sm font-medium">
                                        {installment.payment_term?.trim() || '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data Prevista do Pagamento</p>
                                      <p className="text-sm font-medium">
                                        {installment.expected_payment_date
                                          ? formatDate(installment.expected_payment_date)
                                          : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data do Pagamento</p>
                                      <p className="text-sm font-medium">
                                        {installment.payment_date
                                          ? formatDate(installment.payment_date)
                                          : '—'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros da lista de faturas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Aplicam-se à lista de faturas abaixo</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterBilled} onValueChange={setFilterBilled}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="true">Faturadas</SelectItem>
                  <SelectItem value="false">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês</Label>
              <Input
                placeholder="Ex: Jan/25"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Input
                placeholder="Ex: 25"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de faturas */}
      <Card>
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
          <CardDescription>
            {installments.length} fatura(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {installments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma parcela encontrada
              </div>
            ) : (
              installments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {installment.billed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{installment.month}</span>
                        <Badge variant={installment.billed ? 'default' : 'secondary'}>
                          {installment.billed ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Contrato: {installment.contract?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(parseFloat(installment.value))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(installment.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      {!isClient && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setInstallmentToEdit(installment);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={installment.billed ? 'outline' : 'default'}
                        onClick={() =>
                          handleMarkBilled(installment.id, !installment.billed)
                        }
                      >
                        {installment.billed ? 'Desfazer' : 'Marcar Pago'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(installment.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
















