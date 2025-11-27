/**
 * Página de Clientes
 * Lista e gerencia clientes (apenas admin)
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Client, UserRole } from '@/types';
import api from '@/lib/api';
import { UserCircle, Plus, Trash2 } from 'lucide-react';
import CreateClientDialog from '@/components/CreateClientDialog';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Verificar se o usuário é admin
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === UserRole.ADMIN_GLOBAL || 
                  user?.role === UserRole.ADMIN_PARTNER ||
                  user?.role === 'admin_global' ||
                  user?.role === 'admin_partner';

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
    } else {
      setError('Acesso negado. Apenas administradores podem gerenciar clientes.');
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients');
      // Trata diferentes formatos de resposta da API
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else if (response.data?.clients) {
        setClients(response.data.clients);
      } else {
        setClients([]);
      }
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Acesso negado. Apenas administradores podem gerenciar clientes.');
      } else {
        setError('Erro ao carregar clientes');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o cliente "${clientName}"?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${clientId}`);
      fetchClients();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao deletar cliente';
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
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os clientes do sistema. Apenas administradores podem acessar.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <div className="text-2xl font-bold">{clients.length}</div>
              <div className="text-sm text-muted-foreground">Total de Clientes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.partner ? `Parceiro: ${client.partner.name}` : client.partner_id ? `Parceiro ID: ${client.partner_id}` : 'Sem parceiro associado'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Criado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(client.id, client.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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
      <CreateClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchClients}
      />
    </div>
  );
}

