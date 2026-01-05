/**
 * Página do Dashboard
 * Exibe visão geral consolidada dos contratos e consultores
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DashboardData, UserRole } from '@/types';
import api from '@/lib/api';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se é cliente (usuário que não é admin)
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isClient = user?.role !== UserRole.ADMIN_GLOBAL && 
                   user?.role !== UserRole.ADMIN_PARTNER &&
                   user?.role !== 'admin_global' &&
                   user?.role !== 'admin_partner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get<DashboardData>('/dashboard');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  const { stats, expiring_contracts, financial_summary } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral dos contratos e consultores
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate('/contracts')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contratos Ativos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_contracts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactive_contracts} inativos
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate('/consultants')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Consultores Alocados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.allocated_consultants}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de consultores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Feedback Médio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.average_feedback.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Performance geral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Faturado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(stats.total_billed_value))}
            </div>
            <p className="text-xs text-muted-foreground">
              De {formatCurrency(parseFloat(stats.total_contracts_value))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro */}
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => navigate('/billing')}
      >
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso de Faturamento</span>
              <span className="font-medium">
                {financial_summary.billed_percentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={financial_summary.billed_percentage} />
          </div>
          {isClient ? (
            // Visão Cliente - mantém layout original
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(parseFloat(financial_summary.total_value))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(parseFloat(financial_summary.billed_value))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(parseFloat(financial_summary.balance))}
                </p>
              </div>
            </div>
          ) : (
            // Visão Interna - Faturado e pago, Pendente pagamento, A faturar
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(parseFloat(financial_summary.total_value))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturado e Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(parseFloat(financial_summary.billed_value))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente Pagamento</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(parseFloat(financial_summary.balance))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A Faturar</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(parseFloat(financial_summary.total_value) - parseFloat(financial_summary.billed_value) - parseFloat(financial_summary.balance))}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contratos próximos do vencimento */}
      {expiring_contracts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <CardTitle>Contratos Próximos do Vencimento</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiring_contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{contract.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contract.client_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        contract.days_remaining < 15 ? 'danger' : 'warning'
                      }
                    >
                      {contract.days_remaining} dias restantes
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vence em {formatDate(contract.end_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

















