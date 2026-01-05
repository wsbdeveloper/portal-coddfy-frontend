/**
 * Dialog para criar novo consultor
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Contract, Client } from '@/types';
import api from '@/lib/api';

interface CreateConsultantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateConsultantDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateConsultantDialogProps) {
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    contract_id: '',
    client_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchContracts();
      fetchClients();
      setFormData({
        name: '',
        role: '',
        contract_id: '',
        client_id: '',
      });
    } else {
      // Resetar quando o diálogo fechar
      setFormData({
        name: '',
        role: '',
        contract_id: '',
        client_id: '',
      });
    }
  }, [open]);

  // Filtrar contratos baseado no cliente selecionado
  const filteredContracts = formData.client_id
    ? allContracts.filter((contract) => contract.client_id === formData.client_id)
    : [];

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts?status=ativo');
      setAllContracts(response.data.contracts);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      // Trata diferentes formatos de resposta da API
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else if (response.data?.clients) {
        setClients(response.data.clients);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setClients([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Garantir que todos os campos obrigatórios estão preenchidos
      if (!formData.name.trim() || !formData.role.trim() || !formData.contract_id.trim() || !formData.client_id.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        setLoading(false);
        return;
      }

      // Preparar dados para envio
      const payload = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        contract_id: formData.contract_id.trim(),
        client_id: formData.client_id.trim(),
      };

      await api.post('/consultants', payload);

      // Resetar formulário
      setFormData({
        name: '',
        role: '',
        contract_id: '',
        client_id: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar consultor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Consultor</DialogTitle>
          <DialogDescription>
            Adicione um consultor e aloque-o em um contrato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Consultor *</Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Cargo *</Label>
              <Input
                id="role"
                placeholder="Ex: Tech Lead, Desenvolvedor Senior"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                value={formData.client_id || undefined}
                onValueChange={(value) => {
                  if (value && value.trim()) {
                    setFormData({ 
                      ...formData, 
                      client_id: value.trim(),
                      contract_id: '', // Resetar contrato quando mudar cliente
                    });
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum cliente disponível
                    </div>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contract">Contrato *</Label>
              <Select
                value={formData.contract_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_id: value })
                }
                required
                disabled={!formData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    formData.client_id 
                      ? "Selecione um contrato" 
                      : "Selecione um cliente primeiro"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredContracts.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {formData.client_id 
                        ? "Nenhum contrato disponível para este cliente"
                        : "Selecione um cliente primeiro"}
                    </div>
                  ) : (
                    filteredContracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.client_id || !formData.contract_id}>
              {loading ? 'Criando...' : 'Criar Consultor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

