/**
 * Dialog para criar novo cliente
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
import { Partner } from '@/types';
import api from '@/lib/api';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateClientDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [partner_id, setPartner_id] = useState('');

  useEffect(() => {
    if (open) {
      fetchPartners();
      // Tentar obter o partner_id do usuário logado como padrão
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.partner_id) {
          setPartner_id(user.partner_id);
        }
      }
    }
  }, [open]);

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
      await api.post('/clients', {
        name: name.trim(),
        partner_id: partner_id || null,
      });

      // Resetar formulário
      setName('');
      setPartner_id('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data || 'Erro ao criar cliente';
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
          <DialogDescription>
            Adicione um novo cliente ao sistema. Clientes podem ser associados a contratos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cliente *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Empresa ABC Ltda"
                required
                minLength={1}
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner_id">Parceiro *</Label>
              <Select
                value={partner_id}
                onValueChange={(value) => setPartner_id(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um parceiro" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
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
            <Button type="submit" disabled={loading || !name.trim() || !partner_id}>
              {loading ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

