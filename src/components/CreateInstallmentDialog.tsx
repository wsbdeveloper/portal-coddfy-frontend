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
import { filterContractsByPartner } from '@/lib/auth';

export interface InstallmentEditShape {
  id: string;
  contract_id: string;
  month: string;
  value: string;
  invoice_number?: string | null;
  billing_date?: string | null;
  payment_term?: string | null;
  expected_payment_date?: string | null;
  payment_date?: string | null;
}

interface CreateInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  installmentToEdit?: InstallmentEditShape | null;
}

function isoToDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

export default function CreateInstallmentDialog({
  open,
  onOpenChange,
  onSuccess,
  installmentToEdit,
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

  const isEdit = !!installmentToEdit?.id;

  useEffect(() => {
    if (open) {
      fetchContracts();
      const now = new Date();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentMonth = `${monthNames[now.getMonth()]}/${now.getFullYear().toString().slice(-2)}`;

      if (installmentToEdit) {
        const row = installmentToEdit;
        setFormData({
          contract_id: row.contract_id,
          month: row.month,
          value: row.value,
          invoice_number: row.invoice_number?.trim() || '',
          billing_date: isoToDdMmYyyy(row.billing_date || undefined),
          payment_term: row.payment_term?.trim() || '',
          expected_payment_date: isoToDdMmYyyy(row.expected_payment_date || undefined),
          payment_date: isoToDdMmYyyy(row.payment_date || undefined),
        });
      } else {
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
    }
  }, [open, installmentToEdit]);

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts?status=ativo');
      const list = response.data?.contracts ?? response.data;
      const allContracts = Array.isArray(list) ? list : [];
      // Aplicar filtro de segurança por partner_id ou client_id
      const filteredContracts = filterContractsByPartner<Contract>(allContracts);
      setContracts(filteredContracts);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
      setContracts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_id?.trim()) {
      alert('Por favor, selecione um contrato.');
      return;
    }
    const numValue = parseFloat(formData.value);
    if (isNaN(numValue) || numValue <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }
    setLoading(true);

    // Payload mínimo exigido pela API; campos opcionais só entram se preenchidos
    // O valor deve ser enviado como string para corresponder ao tipo no backend
    const payload: Record<string, unknown> = {
      contract_id: formData.contract_id.trim(),
      month: formData.month.trim(),
      value: numValue.toString(),
    };

    try {

      if (formData.invoice_number?.trim()) {
        payload.invoice_number = formData.invoice_number.trim();
      }
      if (formData.billing_date?.trim()) {
        try {
          payload.billing_date = parseDateToISO(formData.billing_date);
        } catch (err: any) {
          alert('Por favor, insira uma data de faturamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }
      if (formData.payment_term?.trim()) {
        payload.payment_term = formData.payment_term.trim();
      }
      if (formData.expected_payment_date?.trim()) {
        try {
          payload.expected_payment_date = parseDateToISO(formData.expected_payment_date);
        } catch (err: any) {
          alert('Por favor, insira uma data prevista de pagamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }
      if (formData.payment_date?.trim()) {
        try {
          payload.payment_date = parseDateToISO(formData.payment_date);
        } catch (err: any) {
          alert('Por favor, insira uma data de pagamento válida no formato dd/mm/yyyy.');
          setLoading(false);
          return;
        }
      }

      if (isEdit && installmentToEdit) {
        const { contract_id: _omitContract, ...patchBody } = payload;
        await api.put(`/installments/${installmentToEdit.id}`, patchBody);
        alert('Fatura atualizada com sucesso!');
      } else {
        await api.post('/installments', payload);
        alert('Parcela criada com sucesso!');
      }

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
      let errorMessage = isEdit ? 'Erro ao atualizar fatura' : 'Erro ao criar parcela';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.detail) {
          // Pydantic validation errors
          if (Array.isArray(err.response.data.detail)) {
            const errors = err.response.data.detail.map((e: any) => 
              `${e.loc?.join('.') || 'campo'}: ${e.msg || e.message || 'erro'}`
            ).join('\n');
            errorMessage = `Erros de validação:\n${errors}`;
          } else {
            errorMessage = err.response.data.detail;
          }
        } else {
          errorMessage = JSON.stringify(err.response.data, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`${isEdit ? 'Erro ao atualizar fatura' : 'Erro ao criar parcela'}:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateNextMonths = () => {
    const months = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    
    // Data inicial: Janeiro de 2025
    const startDate = new Date(2025, 0, 1); // Janeiro = 0
    // Data final: Mês atual
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Iterar mês a mês de janeiro/2025 até o mês atual
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthStr = `${monthNames[currentDate.getMonth()]}/${currentDate.getFullYear().toString().slice(-2)}`;
      months.push(monthStr);
      // Avançar para o próximo mês
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Fatura' : 'Criar Nova Parcela'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados da fatura.'
              : 'Adicione uma parcela de faturamento a um contrato.'}
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
                disabled={isEdit}
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
                  {(() => {
                    const base = generateNextMonths();
                    const opts =
                      isEdit && formData.month && !base.includes(formData.month)
                        ? [formData.month, ...base]
                        : base;
                    return opts.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ));
                  })()}
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
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar Parcela'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
















