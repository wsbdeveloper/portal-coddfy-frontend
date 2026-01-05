/**
 * Dialog para criar nova parcela
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
import { Contract } from '@/types';
import api from '@/lib/api';
import { formatDateInput, parseDateToISO } from '@/lib/format';

interface CreateInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateInstallmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInstallmentDialogProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contract_id: '',
    month: '',
    value: '',
    invoice_number: '',
    billing_date: '',
    payment_term: '',
    expected_payment_date: '',
    payment_date: '',
  });

  useEffect(() => {
    if (open) {
      fetchContracts();
      // Preenche com mês atual e reseta outros campos
      const now = new Date();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentMonth = `${monthNames[now.getMonth()]}/${now.getFullYear().toString().slice(-2)}`;
      setFormData({
        contract_id: '',
        month: currentMonth,
        value: '',
        invoice_number: '',
        billing_date: '',
        payment_term: '',
        expected_payment_date: '',
        payment_date: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Converter datas para ISO se preenchidas
      const payload: any = {
        contract_id: formData.contract_id,
        month: formData.month,
        value: parseFloat(formData.value),
      };

      if (formData.invoice_number) {
        payload.invoice_number = formData.invoice_number.trim();
      }
      if (formData.billing_date) {
        try {
          payload.billing_date = parseDateToISO(formData.billing_date);
        } catch (err: any) {
          alert('Por favor, insira uma data de faturamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }
      if (formData.payment_term) {
        payload.payment_term = formData.payment_term.trim();
      }
      if (formData.expected_payment_date) {
        try {
          payload.expected_payment_date = parseDateToISO(formData.expected_payment_date);
        } catch (err: any) {
          alert('Por favor, insira uma data prevista de pagamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }
      if (formData.payment_date) {
        try {
          payload.payment_date = parseDateToISO(formData.payment_date);
        } catch (err: any) {
          alert('Por favor, insira uma data de pagamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }

      await api.post('/installments', payload);

      // Resetar formulário
      const now = new Date();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentMonth = `${monthNames[now.getMonth()]}/${now.getFullYear().toString().slice(-2)}`;
      
      setFormData({
        contract_id: '',
        month: currentMonth,
        value: '',
        invoice_number: '',
        billing_date: '',
        payment_term: '',
        expected_payment_date: '',
        payment_date: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar parcela');
    } finally {
      setLoading(false);
    }
  };

  const generateNextMonths = () => {
    const months = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    
    for (let i = -2; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i);
      const monthStr = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
      months.push(monthStr);
    }
    
    return months;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Parcela</DialogTitle>
          <DialogDescription>
            Adicione uma parcela de faturamento a um contrato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="month">Mês de Referência *</Label>
              <Select
                value={formData.month}
                onValueChange={(value) =>
                  setFormData({ ...formData, month: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {generateNextMonths().map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Formato: Mês/Ano (ex: Jan/25)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="value">Valor (R$) *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoice_number">Número da Nota Fiscal</Label>
              <Input
                id="invoice_number"
                placeholder="Ex: 123456"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billing_date">Data de Faturamento (dd/mm/yyyy)</Label>
              <Input
                id="billing_date"
                type="text"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={formData.billing_date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, billing_date: formatted });
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment_term">Prazo de Pagamento</Label>
              <Input
                id="payment_term"
                placeholder="Ex: 30 dias"
                value={formData.payment_term}
                onChange={(e) =>
                  setFormData({ ...formData, payment_term: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expected_payment_date">Data Prevista do Pagamento (dd/mm/yyyy)</Label>
              <Input
                id="expected_payment_date"
                type="text"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={formData.expected_payment_date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, expected_payment_date: formatted });
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment_date">Data do Pagamento (dd/mm/yyyy)</Label>
              <Input
                id="payment_date"
                type="text"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={formData.payment_date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, payment_date: formatted });
                }}
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
              {loading ? 'Criando...' : 'Criar Parcela'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
















