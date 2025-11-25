/**
 * Página de Faturamento
 * Gestão completa de parcelas e análise financeira
 */
import { useEffect, useState } from 'react';
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
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
  Calendar,
} from 'lucide-react';
import CreateInstallmentDialog from '@/components/CreateInstallmentDialog';

interface Installment {
  id: string;
  contract_id: string;
  month: string;
  value: string;
  billed: boolean;
  created_at: string;
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

      setInstallments(installmentsRes.data.installments);
      setSummary(summaryRes.data);
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
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Parcela
          </Button>
        </div>
      </div>

      <CreateInstallmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchData}
      />

      {/* KPIs de Resumo */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Faturado
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
                Total Pendente
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
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
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
                % Faturado
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
              {summary.contracts.map((contract) => (
                <div
                  key={contract.contract_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{contract.contract_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.total_installments} parcela(s)
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Faturado</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(contract.billed_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pendente</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(contract.pending_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">
                          {formatCurrency(contract.total_value)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Refine a busca de parcelas
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterBilled} onValueChange={setFilterBilled}>
                <SelectTrigger>
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

      {/* Tabela de Parcelas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parcelas</CardTitle>
          <CardDescription>
            {installments.length} parcela(s) encontrada(s)
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

                    <div className="flex gap-2">
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
















