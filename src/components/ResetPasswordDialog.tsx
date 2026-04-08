/**
 * Modal: redefinir senha de outro usuário (POST /api/auth/users/{id}/reset-password)
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
import type { User } from '@/types';
import api from '@/lib/api';

const MIN_LEN = 6;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: User | null;
  onSuccess?: () => void;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open]);

  const passwordsMatch = newPassword === confirmPassword;
  const validLength = newPassword.length >= MIN_LEN;
  const formValid = validLength && passwordsMatch && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !formValid) return;

    setLoading(true);
    try {
      await api.post(`/auth/users/${targetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      alert('Senha atualizada com sucesso.');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg =
        data?.error ||
        (typeof data === 'string' ? data : null) ||
        'Não foi possível redefinir a senha.';
      if (status === 404) {
        msg = 'Usuário não encontrado.';
      } else if (status === 403) {
        msg = data?.error || 'Operação não permitida para este usuário.';
      } else if (status === 400 && data?.details) {
        const d = data.details;
        if (typeof d === 'object' && d !== null) {
          const first = Object.values(d)[0];
          if (Array.isArray(first) && first[0]) msg = String(first[0]);
        }
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            A senha será aplicada imediatamente. O usuário poderá entrar com a nova senha no
            próximo login.
          </DialogDescription>
        </DialogHeader>
        {targetUser && (
          <p className="text-sm text-muted-foreground">
            Usuário: <span className="font-medium text-foreground">@{targetUser.username}</span>
            {targetUser.email ? (
              <>
                {' '}
                · <span className="break-all">{targetUser.email}</span>
              </>
            ) : null}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="reset-new-password">Nova senha *</Label>
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={MIN_LEN}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de {MIN_LEN} caracteres.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reset-confirm-password">Confirmar nova senha *</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_LEN}
              required
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formValid}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
