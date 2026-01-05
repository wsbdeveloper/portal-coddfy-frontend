/**
 * Página de Consultores
 * Lista e gerencia consultores por contrato
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConsultantGroup, UserRole } from '@/types';
import api from '@/lib/api';
import { getFeedbackColor } from '@/lib/format';
import { Users, Plus, TrendingUp, ChevronDown, ChevronUp, UserCircle, Star } from 'lucide-react';
import CreateConsultantDialog from '@/components/CreateConsultantDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Consultants() {
  const [groups, setGroups] = useState<ConsultantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [feedbackValue, setFeedbackValue] = useState('85');

  // Verificar se é cliente
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isClient = user?.role !== UserRole.ADMIN_GLOBAL && 
                   user?.role !== UserRole.ADMIN_PARTNER &&
                   user?.role !== 'admin_global' &&
                   user?.role !== 'admin_partner';

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
        {!isClient && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Consultor
          </Button>
        )}
      </div>

      <CreateConsultantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchConsultants}
      />

      {/* Dialog de Feedback */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Feedback</DialogTitle>
            <DialogDescription>
              Avalie o desempenho do consultor (0-100)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback">Nota de Performance (0-100) *</Label>
              <Input
                id="feedback"
                type="number"
                min="0"
                max="100"
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {parseInt(feedbackValue) >= 90
                  ? '🟢 Excelente'
                  : parseInt(feedbackValue) >= 80
                  ? '🟠 Bom'
                  : '🔴 Precisa melhorar'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackDialogOpen(false);
                setSelectedConsultantId(null);
                setFeedbackValue('85');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Aqui você faria a chamada à API para criar o feedback
                  if (selectedConsultantId) {
                    // await api.post(`/consultants/${selectedConsultantId}/feedback`, { feedback: parseInt(feedbackValue) });
                    alert('Feedback criado com sucesso!');
                    setFeedbackDialogOpen(false);
                    setSelectedConsultantId(null);
                    setFeedbackValue('85');
                    fetchConsultants();
                  }
                } catch (err: any) {
                  alert(err.response?.data?.error || 'Erro ao criar feedback');
                }
              }}
            >
              Salvar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                {group.consultants.map((consultant) => {
                  const isExpanded = expandedConsultant === consultant.id;
                  return (
                    <div key={consultant.id}>
                      <div
                        className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedConsultant(isExpanded ? null : consultant.id)}
                      >
                        <div className="flex-1 flex items-center gap-3">
                          {/* Foto do consultor */}
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCircle className="h-6 w-6 text-primary" />
                          </div>
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
                        </div>
                        <div className="flex items-center gap-3">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedConsultant(isExpanded ? null : consultant.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Área expandida com feedback */}
                      {isExpanded && (
                        <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Feedback de Performance</h4>
                            {isClient && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedConsultantId(consultant.id);
                                  setFeedbackDialogOpen(true);
                                }}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                Criar Feedback
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Média de feedbacks: {consultant.feedback}%
                            </p>
                            {/* Histórico de feedbacks - placeholder */}
                            <div className="text-sm text-muted-foreground italic">
                              Histórico de feedbacks será exibido aqui quando disponível
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            {!isClient && (
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Consultor
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

