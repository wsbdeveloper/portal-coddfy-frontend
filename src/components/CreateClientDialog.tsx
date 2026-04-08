/**
 * Dialog para criar ou editar cliente (API: POST /clients, PUT /clients/{id})
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
import { Client, Partner, UserRole } from '@/types';
import api from '@/lib/api';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

function formatCNPJ(value: string) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return value;
}

export default function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
  clientToEdit,
}: CreateClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [corporate_name, setCorporate_name] = useState('');
  const [partner_id, setPartner_id] = useState('');
  const [photo_url, setPhoto_url] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdminGlobal = user?.role === UserRole.ADMIN_GLOBAL || user?.role === 'admin_global';

  const isEdit = !!clientToEdit?.id;

  useEffect(() => {
    if (open) {
      if (isAdminGlobal) {
        fetchPartners();
      }
      if (clientToEdit) {
        setName(clientToEdit.name || '');
        setCnpj(clientToEdit.cnpj ? formatCNPJ(clientToEdit.cnpj) : '');
        setCorporate_name(clientToEdit.razao_social || '');
        setPartner_id(clientToEdit.partner_id || '');
        setPhoto_url(clientToEdit.photo_url || '');
      } else {
        setName('');
        setCnpj('');
        setCorporate_name('');
        setPartner_id('');
        setPhoto_url('');
      }
    }
  }, [open, isAdminGlobal, clientToEdit]);

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
      if (isAdminGlobal && !partner_id) {
        alert('Por favor, selecione um parceiro.');
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        cnpj: cnpj.replace(/\D/g, ''),
        razao_social: corporate_name.trim(),
      };
      if (isAdminGlobal) {
        payload.partner_id = partner_id;
      }
      const photoTrim = photo_url.trim();
      if (photoTrim) {
        payload.photo_url = photoTrim;
      }

      if (isEdit && clientToEdit) {
        await api.put(`/clients/${clientToEdit.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }

      setName('');
      setCnpj('');
      setCorporate_name('');
      setPartner_id('');
      setPhoto_url('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data || 'Erro ao salvar cliente';
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Criar Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados do cliente.'
              : 'Adicione um novo cliente ao sistema. Clientes podem ser associados a contratos.'}
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
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="corporate_name">Razão Social</Label>
              <Input
                id="corporate_name"
                value={corporate_name}
                onChange={(e) => setCorporate_name(e.target.value)}
                placeholder="Ex: Empresa ABC Ltda"
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo_url">Logo / foto (URL, opcional)</Label>
              <Input
                id="photo_url"
                type="url"
                value={photo_url}
                onChange={(e) => setPhoto_url(e.target.value)}
                placeholder="https://…"
              />
            </div>
            {isAdminGlobal && (
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
            )}
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
            <Button
              type="submit"
              disabled={loading || !name.trim() || (isAdminGlobal && !partner_id)}
            >
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
