/**
 * Página de Gerenciamento (Admin Global)
 * Tela única para supervisionar usuários, parceiros e clientes
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Partner, Client, UserRole } from '@/types';
import api from '@/lib/api';
import {
  Users,
  Building2,
  UserCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import CreateUserDialog from '@/components/CreateUserDialog';
import CreatePartnerDialog from '@/components/CreatePartnerDialog';
import CreateClientDialog from '@/components/CreateClientDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Management() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  // Filtros e busca
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userPartnerFilter, setUserPartnerFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [clientPartnerFilter, setClientPartnerFilter] = useState<string>('all');

  // Diálogos
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editPartnerDialogOpen, setEditPartnerDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Expansões
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());

  // Verificar se é Admin Global
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdminGlobal = user?.role === UserRole.ADMIN_GLOBAL || user?.role === 'admin_global';

  useEffect(() => {
    if (!isAdminGlobal) {
      setError('Acesso negado. Apenas administradores globais podem acessar esta página.');
      setLoading(false);
      return;
    }
    fetchAllData();
  }, [isAdminGlobal]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Tentar buscar usuários - tentar diferentes endpoints possíveis
      let usersData: User[] = [];
      try {
        const usersRes = await api.get('/auth/users');
        console.log('=== DEBUG API USUÁRIOS ===');
        console.log('Resposta completa:', usersRes);
        console.log('Status:', usersRes.status);
        console.log('Headers:', usersRes.headers);
        console.log('Data recebida:', usersRes.data);
        console.log('Tipo de data:', typeof usersRes.data);
        console.log('É array?', Array.isArray(usersRes.data));
        
        // Tentar diferentes formatos de resposta
        if (Array.isArray(usersRes.data)) {
          usersData = usersRes.data;
          console.log('✓ Usuários encontrados (array direto):', usersData.length);
        } else if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
          usersData = usersRes.data.users;
          console.log('✓ Usuários encontrados (data.users):', usersData.length);
        } else if (usersRes.data?.data && Array.isArray(usersRes.data.data)) {
          usersData = usersRes.data.data;
          console.log('✓ Usuários encontrados (data.data):', usersData.length);
        } else if (usersRes.data?.items && Array.isArray(usersRes.data.items)) {
          usersData = usersRes.data.items;
          console.log('✓ Usuários encontrados (data.items):', usersData.length);
        } else if (usersRes.data && typeof usersRes.data === 'object') {
          // Tentar extrair qualquer array que possa estar dentro
          const keys = Object.keys(usersRes.data);
          console.log('Chaves disponíveis no objeto:', keys);
          for (const key of keys) {
            if (Array.isArray(usersRes.data[key])) {
              usersData = usersRes.data[key];
              console.log(`✓ Usuários encontrados em data.${key}:`, usersData.length);
              break;
            }
          }
        }
        
        if (usersData.length === 0) {
          console.warn('⚠ Nenhum usuário encontrado na resposta');
          console.warn('Estrutura completa da resposta:', JSON.stringify(usersRes.data, null, 2));
        } else {
          console.log('Usuários carregados:', usersData);
        }
        console.log('=== FIM DEBUG ===');
      } catch (err: any) {
        console.error('=== ERRO AO BUSCAR USUÁRIOS ===');
        console.error('Erro completo:', err);
        console.error('Status:', err.response?.status);
        console.error('Status Text:', err.response?.statusText);
        console.error('Dados do erro:', err.response?.data);
        console.error('Headers do erro:', err.response?.headers);
        console.error('Mensagem:', err.message);
        console.error('=== FIM ERRO ===');
        
        // Tentar endpoint alternativo
        try {
          console.log('Tentando endpoint alternativo /users...');
          const usersRes2 = await api.get('/users');
          console.log('Resposta /users:', usersRes2.data);
          if (Array.isArray(usersRes2.data)) {
            usersData = usersRes2.data;
            console.log('✓ Usuários encontrados em /users:', usersData.length);
          } else if (usersRes2.data?.users) {
            usersData = usersRes2.data.users;
            console.log('✓ Usuários encontrados em /users (data.users):', usersData.length);
          }
        } catch (err2: any) {
          console.error('Endpoint alternativo /users também falhou:', err2.response?.status, err2.response?.data);
        }
      }

      const [partnersRes, clientsRes, contractsRes] = await Promise.all([
        api.get('/partners'),
        api.get('/clients'),
        api.get('/contracts').catch(() => ({ data: { contracts: [] } })),
      ]);

      console.log('=== DADOS FINAIS ANTES DE SETAR ===');
      console.log('Usuários para setar:', usersData.length, usersData);
      console.log('Parceiros:', partnersRes.data);
      console.log('Clientes:', clientsRes.data);
      console.log('Contratos:', contractsRes.data);
      
      setUsers(usersData);
      setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.clients || []);
      setContracts(contractsRes.data?.contracts || []);
      setError(null);
      
      console.log('=== ESTADOS SETADOS ===');
      console.log('Estado users será atualizado com:', usersData.length, 'usuários');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Acesso negado. Você precisa ser Admin Global para acessar esta página.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtros de usuários
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      userSearch === '' ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesPartner =
      userPartnerFilter === 'all' ||
      (userPartnerFilter === 'none' && !u.partner_id) ||
      u.partner_id === userPartnerFilter;
    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && u.is_active) ||
      (userStatusFilter === 'inactive' && !u.is_active);

    return matchesSearch && matchesRole && matchesPartner && matchesStatus;
  });

  // Filtros de clientes
  const filteredClients = clients.filter((c) => {
    return (
      clientPartnerFilter === 'all' ||
      (clientPartnerFilter === 'none' && !c.partner_id) ||
      c.partner_id === clientPartnerFilter
    );
  });

  // Métricas
  const metrics = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.is_active).length,
    totalPartners: partners.length,
    activePartners: partners.filter((p) => p.is_active).length,
    totalClients: clients.length,
    clientsWithoutContracts: clients.filter(
      (c) => !contracts.some((contract) => contract.client_id === c.id)
    ).length,
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;

    try {
      await api.delete(`/auth/users/${userId}`);
      fetchAllData();
      alert('Usuário excluído com sucesso!');
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('Acesso negado. Você precisa ser Admin Global.');
      } else {
        alert(err.response?.data?.error || 'Erro ao excluir usuário');
      }
    }
  };

  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o parceiro "${partnerName}"?`)) return;

    try {
      await api.delete(`/partners/${partnerId}`);
      fetchAllData();
      alert('Parceiro excluído com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir parceiro');
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?`)) return;

    try {
      await api.delete(`/clients/${clientId}`);
      fetchAllData();
      alert('Cliente excluído com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir cliente');
    }
  };

  const togglePartnerExpansion = (partnerId: string) => {
    const newExpanded = new Set(expandedPartners);
    if (newExpanded.has(partnerId)) {
      newExpanded.delete(partnerId);
    } else {
      newExpanded.add(partnerId);
    }
    setExpandedPartners(newExpanded);
  };

  const getPartnerClients = (partnerId: string) => {
    return clients.filter((c) => c.partner_id === partnerId);
  };

  const getPartnerConsultants = (_partnerId: string) => {
    // Esta informação precisaria vir da API
    return 0; // Placeholder
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

  if (!isAdminGlobal) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-500">
          Acesso negado. Apenas administradores globais podem acessar esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento</h1>
        <p className="text-muted-foreground">
          Supervisione e administre usuários, parceiros e clientes
        </p>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeUsers} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parceiros Ativos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activePartners}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalPartners} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.clientsWithoutContracts} sem contratos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>
                Gerencie todos os usuários do sistema
              </CardDescription>
            </div>
            <Button onClick={() => setUserDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros e Busca */}
          <div className="grid gap-4 mb-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                <SelectItem value={UserRole.ADMIN_GLOBAL}>Admin Global</SelectItem>
                <SelectItem value={UserRole.ADMIN_PARTNER}>Admin Parceiro</SelectItem>
                <SelectItem value={UserRole.USER_PARTNER}>Usuário Parceiro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userPartnerFilter} onValueChange={setUserPartnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Parceiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os parceiros</SelectItem>
                <SelectItem value="none">Sem parceiro</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Usuários */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setUserDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Usuário
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                      {user.partner_id && (
                        <Badge variant="secondary">
                          {partners.find((p) => p.id === user.partner_id)?.name || 'Parceiro'}
                        </Badge>
                      )}
                      {user.is_active ? (
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
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditUserDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Parceiros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parceiros</CardTitle>
              <CardDescription>
                Gerencie parceiros e visualize clientes vinculados
              </CardDescription>
            </div>
            <Button onClick={() => setPartnerDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Parceiro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum parceiro cadastrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setPartnerDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Parceiro
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {partners.map((partner) => {
                const isExpanded = expandedPartners.has(partner.id);
                const partnerClients = getPartnerClients(partner.id);
                return (
                  <div key={partner.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex-1 flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={partner.is_active ? 'success' : 'secondary'}>
                              {partner.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {partner.is_strategic && (
                              <Badge variant="outline">Estratégico</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {partnerClients.length} cliente(s)
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {getPartnerConsultants(partner.id)} consultor(es)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePartnerExpansion(partner.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setEditPartnerDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePartner(partner.id, partner.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && partnerClients.length > 0 && (
                      <div className="px-4 pb-4 border-t bg-muted/50">
                        <p className="text-sm font-medium mb-2 mt-2">Clientes Vinculados:</p>
                        <div className="space-y-1">
                          {partnerClients.map((client) => (
                            <div
                              key={client.id}
                              className="flex items-center justify-between p-2 bg-background rounded"
                            >
                              <span className="text-sm">{client.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Gerencie clientes e seus contratos
              </CardDescription>
            </div>
            <Button onClick={() => setClientDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtro por Parceiro */}
          <div className="mb-4">
            <Select value={clientPartnerFilter} onValueChange={setClientPartnerFilter}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Filtrar por parceiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os parceiros</SelectItem>
                <SelectItem value="none">Sem parceiro</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setClientDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => {
                const clientContracts = contracts.filter((c) => c.client_id === client.id);
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {(client as any).cnpj && (
                              <span className="text-sm text-muted-foreground">
                                CNPJ: {(client as any).cnpj}
                              </span>
                            )}
                            {(client as any).razao_social && (
                              <span className="text-sm text-muted-foreground">
                                Razão Social: {(client as any).razao_social}
                              </span>
                            )}
                            {client.partner_id && (
                              <Badge variant="secondary">
                                {partners.find((p) => p.id === client.partner_id)?.name || 'Parceiro'}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {clientContracts.length} contrato(s) ativo(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setEditClientDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <CreateUserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        onSuccess={fetchAllData}
      />

      <CreatePartnerDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        onSuccess={fetchAllData}
      />

      <CreateClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSuccess={fetchAllData}
      />

      {/* Diálogo de Edição de Usuário */}
      <EditUserDialog
        open={editUserDialogOpen}
        onOpenChange={setEditUserDialogOpen}
        user={selectedUser}
        onSuccess={fetchAllData}
      />

      {/* Diálogo de Edição de Parceiro */}
      <EditPartnerDialog
        open={editPartnerDialogOpen}
        onOpenChange={setEditPartnerDialogOpen}
        partner={selectedPartner}
        onSuccess={fetchAllData}
      />

      {/* Diálogo de Edição de Cliente */}
      <EditClientDialog
        open={editClientDialogOpen}
        onOpenChange={setEditClientDialogOpen}
        client={selectedClient}
        onSuccess={fetchAllData}
      />
    </div>
  );
}

// Componente de Edição de Usuário
function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: UserRole.USER_PARTNER,
    is_active: true,
  });

  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Garantir que role seja enviado como string
      await api.put(`/auth/users/${user.id}`, {
        ...formData,
        role: String(formData.role), // Garantir que seja string
      });
      onSuccess();
      onOpenChange(false);
      alert('Usuário atualizado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Atualize as informações do usuário</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Nome de Usuário *</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN_GLOBAL}>Administrador Global</SelectItem>
                  <SelectItem value={UserRole.ADMIN_PARTNER}>Administrador Parceiro</SelectItem>
                  <SelectItem value={UserRole.USER_PARTNER}>Usuário Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-is-active" className="cursor-pointer">
                Usuário ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de Edição de Parceiro
function EditPartnerDialog({
  open,
  onOpenChange,
  partner,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_strategic: false,
    is_active: true,
  });

  useEffect(() => {
    if (partner && open) {
      setFormData({
        name: partner.name,
        is_strategic: (partner as any).is_strategic || false,
        is_active: partner.is_active,
      });
    }
  }, [partner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    setLoading(true);
    try {
      await api.put(`/partners/${partner.id}`, formData);
      onSuccess();
      onOpenChange(false);
      alert('Parceiro atualizado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar parceiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Parceiro</DialogTitle>
          <DialogDescription>Atualize as informações do parceiro</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-partner-name">Nome *</Label>
              <Input
                id="edit-partner-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is-strategic"
                checked={formData.is_strategic}
                onChange={(e) => setFormData({ ...formData, is_strategic: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-is-strategic" className="cursor-pointer">
                Estratégico
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-partner-is-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-partner-is-active" className="cursor-pointer">
                Ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de Edição de Cliente
function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    razao_social: '',
  });

  useEffect(() => {
    if (client && open) {
      setFormData({
        name: client.name,
        cnpj: (client as any).cnpj || '',
        razao_social: (client as any).razao_social || (client as any).corporate_name || '',
      });
    }
  }, [client, open]);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);
    try {
      await api.put(`/clients/${client.id}`, {
        name: formData.name.trim(),
        cnpj: formData.cnpj.replace(/\D/g, ''),
        razao_social: formData.razao_social.trim(),
      });
      onSuccess();
      onOpenChange(false);
      alert('Cliente atualizado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Atualize as informações do cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-client-name">Nome *</Label>
              <Input
                id="edit-client-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-client-cnpj">CNPJ</Label>
              <Input
                id="edit-client-cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-client-razao">Razão Social</Label>
              <Input
                id="edit-client-razao"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

