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
import { Partner, UserRole } from '@/types';
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: UserRole.USER_PARTNER,
    partner_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchPartners();
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
      await api.post('/users', {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        partner_id: formData.partner_id || null,
      });

      // Resetar formulário
      setFormData({
        username: '',
        email: '',
        password: '',
        role: UserRole.USER_PARTNER,
        partner_id: '',
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
            Adicione um novo usuário ao sistema. O usuário deve estar associado a um parceiro.
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
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

