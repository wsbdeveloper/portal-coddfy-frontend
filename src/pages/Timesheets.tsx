/**
 * Página de Timesheets
 * Gestão completa de timesheets com CRUD e filtros
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Timesheet, Contract, Consultant, UserRole } from '@/types';
import api from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FileCheck,
} from 'lucide-react';
import CreateTimesheetDialog from '@/components/CreateTimesheetDialog';

export default function Timesheets() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);

  // Filtros
  const [filterContract, setFilterContract] = useState<string>('all');
  const [filterConsultant, setFilterConsultant] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar permissões
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === UserRole.ADMIN_GLOBAL || 
                  user?.role === UserRole.ADMIN_PARTNER ||
                  user?.role === 'admin_global' ||
                  user?.role === 'admin_partner';
  const isClient = !isAdmin && user?.role !== 'admin_global' && user?.role !== 'admin_partner';

  useEffect(() => {
    if (!isClient) {
      fetchData();
      fetchContracts();
      fetchConsultants();
    } else {
      setError('Acesso negado. Apenas administradores e parceiros podem acessar timesheets.');
      setLoading(false);
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) {
      fetchData();
    }
  }, [filterContract, filterConsultant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterContract !== 'all') {
        params.append('contract_id', filterContract);
      }
      if (filterConsultant !== 'all') {
        params.append('consultant_id', filterConsultant);
      }

      const response = await api.get(`/timesheets?${params.toString()}`);
      setTimesheets(Array.isArray(response.data) ? response.data : (response.data?.timesheets || []));
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar timesheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts');
      const contractsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.contracts || []);
      setContracts(contractsData);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    }
  };

  const fetchConsultants = async () => {
    try {
      const response = await api.get('/consultants');
      const groups = response.data?.groups || [];
      const allConsultants: Consultant[] = [];
      groups.forEach((group: any) => {
        if (group.consultants && Array.isArray(group.consultants)) {
          allConsultants.push(...group.consultants);
        }
      });
      setConsultants(allConsultants);
    } catch (err) {
      console.error('Erro ao carregar consultores:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este timesheet?')) return;

    try {
      await api.delete(`/timesheets/${id}`);
      fetchData();
      alert('Timesheet excluído com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir timesheet');
    }
  };

  const handleEdit = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterContract('all');
    setFilterConsultant('all');
    setSearchTerm('');
  };

  // Filtrar timesheets por termo de busca
  const filteredTimesheets = timesheets.filter((ts) => {
    const matchesSearch = !searchTerm || 
      ts.contract?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.consultant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.approver?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading && timesheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error && !isAdmin) {
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
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-muted-foreground">
            Gerencie os timesheets de consultores por contrato
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Timesheet
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
          <CardDescription>
            Filtre os timesheets por contrato ou consultor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por contrato, consultor ou aprovador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="space-y-2">
              <Label>Contrato</Label>
              <Select value={filterContract} onValueChange={setFilterContract}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os contratos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os contratos</SelectItem>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consultor</Label>
              <Select value={filterConsultant} onValueChange={setFilterConsultant}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os consultores</SelectItem>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Timesheets</CardTitle>
          <CardDescription>
            {filteredTimesheets.length} timesheet(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum timesheet encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Timesheet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {timesheet.contract?.name || 'Contrato não encontrado'}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {timesheet.consultant && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{timesheet.consultant.name}</span>
                            </div>
                          )}
                          {timesheet.hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{timesheet.hours}h</span>
                            </div>
                          )}
                          {timesheet.approval_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Aprovado em {timesheet.approval_date ? formatDate(timesheet.approval_date) : '—'}</span>
                            </div>
                          )}
                          {timesheet.approver && (
                            <div className="flex items-center gap-1">
                              <FileCheck className="h-4 w-4" />
                              <span>Aprovado por: {timesheet.approver}</span>
                            </div>
                          )}
                        </div>
                        {timesheet.file_url && (
                          <div className="mt-2">
                            <a
                              href={timesheet.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Ver arquivo
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {timesheet.created_at ? formatDate(timesheet.created_at) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(timesheet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(timesheet.id)}
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

      {/* Diálogos */}
      <CreateTimesheetDialog
        open={dialogOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditDialogOpen(false);
            setSelectedTimesheet(null);
          }
        }}
        onSuccess={fetchData}
        timesheet={editDialogOpen ? selectedTimesheet : null}
      />
    </div>
  );
}

