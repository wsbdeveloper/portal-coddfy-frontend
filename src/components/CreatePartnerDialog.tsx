/**
 * Dialog para criar novo parceiro
 */
import { useState } from 'react';
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
import api from '@/lib/api';

interface CreatePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePartnerDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePartnerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/partners', {
        name: name.trim(),
      });

      // Resetar formulário
      setName('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar parceiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Parceiro</DialogTitle>
          <DialogDescription>
            Adicione um novo parceiro ao sistema. Parceiros permitem segregar dados e usuários.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Parceiro</Label>
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
              {loading ? 'Criando...' : 'Criar Parceiro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

