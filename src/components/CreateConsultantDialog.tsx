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
import { Contract, Partner } from '@/types';
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    contract_id: '',
    partner_id: '',
    feedback: '85',
  });

  useEffect(() => {
    if (open) {
      fetchContracts();
      fetchPartners();
      // Tentar obter o partner_id do usuário logado como padrão
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.partner_id) {
            setFormData(prev => ({ ...prev, partner_id: user.partner_id }));
          }
        } catch (e) {
          console.error('Erro ao parsear usuário:', e);
        }
      }
    } else {
      // Resetar quando o diálogo fechar
      setFormData({
        name: '',
        role: '',
        contract_id: '',
        partner_id: '',
        feedback: '85',
      });
    }
  }, [open]);

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts?status=ativo');
      setContracts(response.data.contracts);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners');
      setPartners(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar parceiros:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação adicional
      if (!formData.partner_id || formData.partner_id.trim() === '') {
        alert('Por favor, selecione um parceiro.');
        setLoading(false);
        return;
      }

      await api.post('/consultants', {
        ...formData,
        feedback: parseInt(formData.feedback),
      });

      // Resetar formulário
      setFormData({
        name: '',
        role: '',
        contract_id: '',
        partner_id: '',
        feedback: '85',
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
              <Label htmlFor="partner_id">Parceiro *</Label>
              <Select
                value={formData.partner_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, partner_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um parceiro" />
                </SelectTrigger>
                <SelectContent>
                  {partners.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum parceiro disponível
                    </div>
                  ) : (
                    partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name} ({contract.client?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback">
                Feedback de Performance (0-100) *
              </Label>
              <Input
                id="feedback"
                type="number"
                min="0"
                max="100"
                value={formData.feedback}
                onChange={(e) =>
                  setFormData({ ...formData, feedback: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                {parseInt(formData.feedback) >= 90
                  ? '🟢 Excelente'
                  : parseInt(formData.feedback) >= 80
                  ? '🟠 Bom'
                  : '🔴 Precisa melhorar'}
              </p>
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
            <Button type="submit" disabled={loading || !formData.partner_id}>
              {loading ? 'Criando...' : 'Criar Consultor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

