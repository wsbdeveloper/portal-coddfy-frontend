/**
 * Página de Consultores
 * Lista e gerencia consultores por contrato
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConsultantGroup } from '@/types';
import api from '@/lib/api';
import { getFeedbackColor } from '@/lib/format';
import { Users, Plus, TrendingUp } from 'lucide-react';
import CreateConsultantDialog from '@/components/CreateConsultantDialog';

export default function Consultants() {
  const [groups, setGroups] = useState<ConsultantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchConsultants();
  }, []);

  const fetchConsultants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consultants');
      setGroups(response.data.groups);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar consultores');
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
          <h1 className="text-3xl font-bold tracking-tight">Consultores</h1>
          <p className="text-muted-foreground">
            Gerencie os consultores alocados nos contratos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Consultor
        </Button>
      </div>

      <CreateConsultantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchConsultants}
      />

      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.contract_id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{group.contract_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {group.client_name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {group.total_consultants} consultor(es)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Média: {group.average_feedback.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.consultants.map((consultant) => (
                  <div
                    key={consultant.id}
                    className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">{consultant.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {consultant.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Performance Individual
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={getFeedbackColor(consultant.feedback)}
                        className="text-base px-4 py-1"
                      >
                        {consultant.feedback}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {consultant.feedback >= 90
                          ? 'Excelente'
                          : consultant.feedback >= 80
                          ? 'Bom'
                          : 'Precisa melhorar'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhum consultor cadastrado
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Consultor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

