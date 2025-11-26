/**
 * Dialog para criar novo contrato
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
import { Client } from '@/types';
import api from '@/lib/api';

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateContractDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateContractDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    total_value: '',
    status: 'ativo',
    end_date: '',
  });

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
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
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Valida se o valor total é válido
      const totalValue = parseFloat(formData.total_value);
      if (isNaN(totalValue) || totalValue < 0) {
        alert('Por favor, insira um valor total válido maior ou igual a zero.');
        setLoading(false);
        return;
      }

      await api.post('/contracts', {
        ...formData,
        total_value: totalValue,
        end_date: new Date(formData.end_date).toISOString(),
      });

      // Resetar formulário
      setFormData({
        name: '',
        client_id: '',
        total_value: '',
        status: 'ativo',
        end_date: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Contrato</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo contrato de consultoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Contrato *</Label>
              <Input
                id="name"
                placeholder="Ex: Desenvolvimento Sistema ERP"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, client_id: value })
                }
                required
                disabled={loadingClients}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={
                      loadingClients 
                        ? "Carregando clientes..." 
                        : clients.length === 0 
                        ? "Nenhum cliente disponível" 
                        : "Selecione um cliente"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingClients && clients.length > 0 && (
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
              <Label htmlFor="total_value">Valor Total (R$) *</Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_value}
                onChange={(e) =>
                  setFormData({ ...formData, total_value: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="a_vencer">A Vencer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end_date">Data de Vencimento *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
              />
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

