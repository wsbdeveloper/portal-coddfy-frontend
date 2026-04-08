/**
 * Página de Contratos
 * Lista e gerencia contratos
 */
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Contract, ContractStatus, UserRole, Timesheet } from '@/types';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { filterContractsByPartner } from '@/lib/auth';
import { FileText, Plus, ChevronDown, ChevronUp, Trash2, Pencil, Download } from 'lucide-react';
import CreateContractDialog from '@/components/CreateContractDialog';
import {
  getContractFinancialBreakdown,
  contractTypeLabel,
  paymentMethodLabel,
} from '@/lib/contractFinancials';
import { downloadTimesheetAsExcel } from '@/lib/timesheetFileDownload';

const MONTH_ABBR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function monthLabelFromIso(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTH_ABBR[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

function timesheetMatchesInstallmentMonth(ts: Timesheet, installmentMonth: string): boolean {
  const ref = ts.approval_date || ts.created_at;
  if (!ref) return false;
  return monthLabelFromIso(ref) === installmentMonth;
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isClient =
    user?.role !== UserRole.ADMIN_GLOBAL && user?.role !== 'admin_global';

  const hoursSumByContract = useMemo(() => {
    const map = new Map<string, number>();
    for (const ts of timesheets) {
      const cid = ts.contract_id;
      const h = typeof ts.hours === 'number' ? ts.hours : parseFloat(String(ts.hours || 0)) || 0;
      map.set(cid, (map.get(cid) || 0) + h);
    }
    return map;
  }, [timesheets]);

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (isClient) return;
    const loadTs = async () => {
      try {
        const response = await api.get('/timesheets');
        const all = Array.isArray(response.data)
          ? response.data
          : response.data?.timesheets || [];
        setTimesheets(all);
      } catch {
        setTimesheets([]);
      }
    };
    loadTs();
  }, [isClient]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contracts');
      const allContracts: Contract[] = response.data.contracts || [];
      const filteredContracts = filterContractsByPartner<Contract>(allContracts);
      setContracts(filteredContracts);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar contratos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato "${contractName}"?`)) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      fetchContracts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir contrato');
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    const variants = {
      [ContractStatus.ATIVO]: 'success',
      [ContractStatus.INATIVO]: 'secondary',
      [ContractStatus.A_VENCER]: 'warning',
    } as const;

    const labels = {
      [ContractStatus.ATIVO]: 'Ativo',
      [ContractStatus.INATIVO]: 'Inativo',
      [ContractStatus.A_VENCER]: 'A Vencer',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const openCreate = () => {
    setContractToEdit(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Contract) => {
    setContractToEdit(c);
    setDialogOpen(true);
  };

  const dialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setContractToEdit(null);
  };

  if (loading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie os contratos de consultoria</p>
        </div>
        {!isClient && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>

      {!isClient && (
        <CreateContractDialog
          open={dialogOpen}
          onOpenChange={dialogOpenChange}
          onSuccess={fetchContracts}
          contractToEdit={contractToEdit}
        />
      )}

      <div className="grid gap-4">
        {contracts.map((contract) => {
          const isExpanded = expandedContract === contract.id;
          const fin = getContractFinancialBreakdown(contract);
          const contractedHours =
            contract.total_hours_contracted != null
              ? parseFloat(String(contract.total_hours_contracted))
              : NaN;
          const usedHours = hoursSumByContract.get(contract.id) || 0;
          const hoursBalance = !isNaN(contractedHours)
            ? contractedHours - usedHours
            : null;
          const contractTimesheets = timesheets.filter((t) => t.contract_id === contract.id);

          return (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <CardTitle
                        className="text-xl cursor-pointer hover:text-primary"
                        onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                      >
                        {contract.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {contract.client?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Responsável: {contract.responsible_name?.trim() || '—'}
                    </p>
                    <div className="rounded-md bg-muted/60 px-3 py-2 text-sm space-y-1 max-w-xl">
                      <p>
                        <span className="text-muted-foreground">Tipo de Contrato: </span>
                        {contractTypeLabel(contract.contract_type)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Forma de Pagamento: </span>
                        {paymentMethodLabel(contract.payment_method)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(contract.status)}
                    {!isClient && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(contract);
                          }}
                          title="Editar contrato"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContract(contract.id, contract.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Percentual Faturado</span>
                    <span className="font-medium">
                      {contract.billed_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={contract.billed_percentage} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold">{formatCurrency(fin.total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturado e Pago</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(fin.billedPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Faturado e Pendente Pagamento
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(fin.billedPending)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A faturar</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(fin.toBill)}
                    </p>
                  </div>
                </div>

                {hoursBalance !== null && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <span className="font-medium text-primary">Saldo de Horas: </span>
                    <span className="font-semibold">
                      {hoursBalance.toFixed(1)} h
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      (contratadas {contractedHours.toFixed(1)} h − apontadas {usedHours.toFixed(1)} h)
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vigência até:</span>
                    <span className="font-medium">{formatDate(contract.end_date)}</span>
                  </div>
                </div>

                {contract.installments && contract.installments.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Parcelas / faturas:</p>
                    <div className="flex flex-wrap gap-2">
                      {contract.installments.map((installment) => (
                        <Badge
                          key={installment.id}
                          variant={installment.billed ? 'success' : 'outline'}
                        >
                          {installment.month} —{' '}
                          {formatCurrency(parseFloat(installment.value))}
                          {installment.billed && ' ✓'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-4">Histórico de Faturamentos</p>
                    <div className="space-y-3">
                      {contract.installments && contract.installments.length > 0 ? (
                        contract.installments.map((installment) => {
                          const linked = contractTimesheets.filter((ts) =>
                            timesheetMatchesInstallmentMonth(ts, installment.month)
                          );
                          return (
                            <Card key={installment.id} className="bg-muted/50">
                              <CardContent className="pt-4">
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Mês</p>
                                    <p className="font-medium">{installment.month}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Valor</p>
                                    <p className="font-medium">
                                      {formatCurrency(parseFloat(installment.value))}
                                    </p>
                                  </div>
                                  <div className="md:col-span-2 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                      Timesheet (mês de referência)
                                    </p>
                                    {linked.length === 0 ? (
                                      <p className="text-sm text-muted-foreground italic">
                                        Nenhum timesheet associado a este mês.
                                      </p>
                                    ) : (
                                      linked.map((ts) => (
                                        <div
                                          key={ts.id}
                                          className="rounded-md border bg-background/80 p-3 text-sm space-y-1"
                                        >
                                          <p>
                                            <span className="text-muted-foreground">Horas: </span>
                                            <span className="font-medium">
                                              {ts.hours != null ? `${ts.hours} h` : '—'}
                                            </span>
                                          </p>
                                          <p>
                                            <span className="text-muted-foreground">
                                              Validado por:{' '}
                                            </span>
                                            {ts.approver?.trim() || '—'}
                                          </p>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-1"
                                            onClick={async () => {
                                              try {
                                                await downloadTimesheetAsExcel(ts);
                                              } catch (e: any) {
                                                alert(e?.message || 'Erro ao baixar timesheet');
                                              }
                                            }}
                                          >
                                            <Download className="mr-2 h-4 w-4" />
                                            Baixar Excel
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum histórico de faturamento disponível
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum contrato cadastrado</p>
            {!isClient && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Contrato
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
