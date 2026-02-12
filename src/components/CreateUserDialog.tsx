/**
 * Dialog para criar novo usuário
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
import { Partner, Client, UserRole } from '@/types';
import api from '@/lib/api';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: UserRole.USER_PARTNER,
    assignment_type: 'partner' as 'partner' | 'client' | 'internal',
    partner_id: '',
    client_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchPartners();
      fetchClients();
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

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      const clientsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.clients || []);
      setClients(clientsData);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar campos obrigatórios baseado no assignment_type
      if (formData.assignment_type === 'client' && !formData.client_id) {
        alert('Por favor, selecione um cliente.');
        setLoading(false);
        return;
      }
      if (formData.assignment_type === 'partner' && !formData.partner_id) {
        alert('Por favor, selecione um parceiro.');
        setLoading(false);
        return;
      }

      // Montar payload conforme nova API
      const payload: any = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: String(formData.role),
        assignment_type: formData.assignment_type,
      };

      // Adicionar partner_id ou client_id conforme assignment_type
      if (formData.assignment_type === 'partner') {
        payload.partner_id = formData.partner_id || null;
      } else if (formData.assignment_type === 'client') {
        payload.client_id = formData.client_id || null;
      }
      // Para 'internal', não adiciona nem partner_id nem client_id

      await api.post('/auth/register', payload);

      // Resetar formulário
      setFormData({
        username: '',
        email: '',
        password: '',
        role: UserRole.USER_PARTNER,
        assignment_type: 'partner',
        partner_id: '',
        client_id: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data || 'Erro ao criar usuário';
      alert(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Adicione um novo usuário ao sistema. Selecione o tipo de associação do usuário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <Input
                id="username"
                placeholder="Ex: joao.silva"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: joao.silva@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN_GLOBAL}>Administrador Global</SelectItem>
                  <SelectItem value={UserRole.ADMIN_PARTNER}>Administrador Parceiro</SelectItem>
                  <SelectItem value={UserRole.USER_PARTNER}>Usuário Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignment_type">Tipo de Associação *</Label>
              <Select
                value={formData.assignment_type}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    assignment_type: value as 'partner' | 'client' | 'internal',
                    partner_id: '', // Reset ao mudar tipo
                    client_id: '', // Reset ao mudar tipo
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de associação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Parceiro</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.assignment_type === 'partner' && 'Usuário associado a um parceiro'}
                {formData.assignment_type === 'client' && 'Usuário associado a um cliente (partner_id será deduzido automaticamente)'}
                {formData.assignment_type === 'internal' && 'Usuário interno do sistema'}
              </p>
            </div>

            {formData.assignment_type === 'partner' && (
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
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.assignment_type === 'client' && (
              <div className="grid gap-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, client_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
              disabled={
                loading ||
                (formData.assignment_type === 'partner' && !formData.partner_id) ||
                (formData.assignment_type === 'client' && !formData.client_id)
              }
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

