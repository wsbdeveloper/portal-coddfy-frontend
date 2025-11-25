/**
 * Página de Parceiros
 * Lista e gerencia parceiros (apenas admin global)
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Partner } from '@/types';
import api from '@/lib/api';
import { Building2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import CreatePartnerDialog from '@/components/CreatePartnerDialog';

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partners');
      // A API retorna um array diretamente (schema.dump retorna lista)
      setPartners(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Acesso negado. Apenas administradores globais podem gerenciar parceiros.');
      } else {
        setError('Erro ao carregar parceiros');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o parceiro "${partnerName}"?`)) {
      return;
    }

    try {
      await api.delete(`/partners/${partnerId}`);
      fetchPartners();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao deletar parceiro';
      alert(errorMsg);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parceiros</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os parceiros do sistema. Apenas administradores globais podem acessar.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Parceiro
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{partners.length}</div>
              <div className="text-sm text-muted-foreground">Total de Parceiros</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {partners.filter((p) => p.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Parceiros Ativos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {partners.filter((p) => !p.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Parceiros Inativos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parceiros</CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum parceiro cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{partner.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Criado em {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {partner.is_active ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Inativo
                      </Badge>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(partner.id, partner.name)}
                    >
                      Deletar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreatePartnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchPartners}
      />
    </div>
  );
}

