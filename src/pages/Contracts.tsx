/**
 * Página de Contratos
 * Lista e gerencia contratos
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Contract, ContractStatus, UserRole } from '@/types';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import CreateContractDialog from '@/components/CreateContractDialog';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // Verificar se é cliente
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isClient = user?.role !== UserRole.ADMIN_GLOBAL && 
                   user?.role !== 'admin_global';

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contracts');
      setContracts(response.data.contracts);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar contratos');
      console.error(err);
    } finally {
      setLoading(false);
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
          <p className="text-muted-foreground">
            Gerencie os contratos de consultoria
          </p>
        </div>
        {!isClient && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>
      
      {!isClient && (<CreateContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchContracts}
      />)}
      

      <div className="grid gap-4">
        {contracts.map((contract) => {
          const isExpanded = expandedContract === contract.id;
          return (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
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
                      Responsável: {contract.client?.name}
                    </p>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Percentual Faturado
                  </span>
                  <span className="font-medium">
                    {contract.billed_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={contract.billed_percentage} />
              </div>

              {/* Valores financeiros */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(parseFloat(contract.total_value))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturado</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(parseFloat(contract.billed_value))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(parseFloat(contract.balance))}
                  </p>
                </div>
              </div>

              {/* Vigência */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vigência até:</span>
                  <span className="font-medium">
                    {formatDate(contract.end_date)}
                  </span>
                </div>
              </div>

              {/* Parcelas (se existirem) */}
              {contract.installments && contract.installments.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Parcelas:</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.installments.map((installment) => (
                      <Badge
                        key={installment.id}
                        variant={installment.billed ? 'success' : 'outline'}
                      >
                        {installment.month} -{' '}
                        {formatCurrency(parseFloat(installment.value))}
                        {installment.billed && ' ✓'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico de Faturamentos (expansão) */}
              {isExpanded && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-4">Histórico de Faturamentos</p>
                  <div className="space-y-3">
                    {contract.installments && contract.installments.length > 0 ? (
                      contract.installments.map((installment) => (
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
                              <div className="md:col-span-2">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Timesheet validado com cliente
                                </p>
                                <p className="text-sm text-muted-foreground italic">
                                  {/* Placeholder - será preenchido quando a API retornar os dados */}
                                  Informações de timesheet serão exibidas aqui quando disponíveis
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
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
            <p className="text-lg text-muted-foreground">
              Nenhum contrato cadastrado
            </p>
            {!isClient && (
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
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

