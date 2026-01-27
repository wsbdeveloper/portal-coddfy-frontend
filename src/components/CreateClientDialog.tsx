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
import { Partner, UserRole } from '@/types';
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
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [corporate_name, setCorporate_name] = useState('');
  const [partner_id, setPartner_id] = useState('');

  // Verificar se é Admin Global
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdminGlobal = user?.role === UserRole.ADMIN_GLOBAL || user?.role === 'admin_global';

  useEffect(() => {
    if (open) {
      if (isAdminGlobal) {
        fetchPartners();
      }
      // Resetar quando o diálogo abrir
      setName('');
      setCnpj('');
      setCorporate_name('');
      setPartner_id('');
    }
  }, [open, isAdminGlobal]);

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners');
      setPartners(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar parceiros:', err);
    }
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
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
    
    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        cnpj: cnpj.replace(/\D/g, ''), // Envia apenas números
        razao_social: corporate_name.trim(),
      };

      // Se for Admin Global, partner_id é obrigatório conforme PRD
      if (isAdminGlobal) {
        if (!partner_id) {
          alert('Por favor, selecione um parceiro.');
          setLoading(false);
          return;
        }
        payload.partner_id = partner_id;
      }
      
      await api.post('/clients', payload);

      // Resetar formulário
      setName('');
      setCnpj('');
      setCorporate_name('');
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
              {loading ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

