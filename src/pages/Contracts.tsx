/**
 * Página de Contratos
 * Lista e gerencia contratos
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Contract, ContractStatus } from '@/types';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, Plus } from 'lucide-react';
import CreateContractDialog from '@/components/CreateContractDialog';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      <CreateContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchContracts}
      />

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-xl">{contract.name}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {contract.client?.name}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhum contrato cadastrado
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Contrato
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

