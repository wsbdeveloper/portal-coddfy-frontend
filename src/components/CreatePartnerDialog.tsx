/**
 * Dialog para criar ou editar parceiro (API: POST /partners, PUT /partners/{id})
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
import api from '@/lib/api';
import { Partner } from '@/types';

interface CreatePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  partnerToEdit?: Partner | null;
}

export default function CreatePartnerDialog({
  open,
  onOpenChange,
  onSuccess,
  partnerToEdit,
}: CreatePartnerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [is_strategic, setIs_strategic] = useState('false');
  const [is_active, setIs_active] = useState('true');
  const [logo_url, setLogo_url] = useState('');

  const isEdit = !!partnerToEdit?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nameTrim = name.trim();
      const strategic = is_strategic === 'true';
      const active = is_active === 'true';

      const body: Record<string, unknown> = {
        name: nameTrim,
        is_strategic: strategic,
        is_active: active,
      };
      const logoTrim = logo_url.trim();
      if (logoTrim) {
        body.logo_url = logoTrim.slice(0, 500);
      }

      if (isEdit && partnerToEdit) {
        await api.put(`/partners/${partnerToEdit.id}`, body);
      } else {
        await api.post('/partners', body);
      }

      setName('');
      setIs_strategic('false');
      setIs_active('true');
      setLogo_url('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar parceiro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (partnerToEdit) {
        setName(partnerToEdit.name || '');
        setIs_strategic(partnerToEdit.is_strategic ? 'true' : 'false');
        setIs_active(partnerToEdit.is_active ? 'true' : 'false');
        setLogo_url(partnerToEdit.logo_url || partnerToEdit.photo_url || '');
      } else {
        setName('');
        setIs_strategic('false');
        setIs_active('true');
        setLogo_url('');
      }
    }
  }, [open, partnerToEdit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Parceiro' : 'Criar Novo Parceiro'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados do parceiro.'
              : 'Adicione um novo parceiro ao sistema. Parceiros permitem segregar dados e usuários.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Parceiro *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Robbin Consulting"
                required
                minLength={1}
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo_url">Logo (URL, opcional)</Label>
              <Input
                id="logo_url"
                type="url"
                value={logo_url}
                onChange={(e) => setLogo_url(e.target.value)}
                placeholder="https://… ou path retornado pelo storage"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Até 500 caracteres. Opcional.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="is_strategic">Estratégico ou não *</Label>
              <Select
                value={is_strategic}
                onValueChange={(value) => setIs_strategic(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Estratégico</SelectItem>
                  <SelectItem value="false">Não Estratégico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={is_active}
                onValueChange={(value) => setIs_active(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Parceiro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
