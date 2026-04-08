/**
 * Dialog para criar ou editar contrato
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
import { Client, Contract, ContractTypeCode } from '@/types';
import api from '@/lib/api';
import {
  formatCurrencyInput,
  unformatCurrency,
  formatDateInput,
  parseDateToISO,
} from '@/lib/format';

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contractToEdit?: Contract | null;
}

const EMPTY_FORM = {
  name: '',
  client_id: '',
  responsible_name: '',
  contract_type: '' as ContractTypeCode | '',
  payment_method: '' as 'a_vista' | 'parcelado' | '',
  monthly_hours_estimated: '',
  contract_months_count: '',
  total_hours_contracted: '',
  installment_amount: '',
  installments_count: '',
  total_value: '',
  status: 'ativo',
  end_date: '',
};

function isoToDdMmYyyy(iso: string): string {
  if (!iso) return '';
  const s = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function normalizeContractTypeFromApi(raw?: string | null): ContractTypeCode | '' {
  if (!raw) return '';
  const r = String(raw).toLowerCase();
  if (r === 'body_shop_recorrente' || r === 'body_shop_recurrent') return 'body_shop_recorrente';
  if (r === 'time_material') return 'time_material';
  if (r === 'projeto' || r === 'project') return 'projeto';
  return '';
}

export default function CreateContractDialog({
  open,
  onOpenChange,
  onSuccess,
  contractToEdit,
}: CreateContractDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const isEdit = !!contractToEdit?.id;

  useEffect(() => {
    if (open) {
      fetchClients();
      if (contractToEdit) {
        const c = contractToEdit;
        setFormData({
          name: c.name || '',
          client_id: c.client_id || '',
          responsible_name: (c.responsible_name as string) || '',
          contract_type: normalizeContractTypeFromApi(c.contract_type),
          payment_method: (c.payment_method as 'a_vista' | 'parcelado') || '',
          monthly_hours_estimated:
            c.estimated_monthly_hours != null
              ? String(c.estimated_monthly_hours)
              : c.monthly_hours_estimated != null
                ? String(c.monthly_hours_estimated)
                : '',
          contract_months_count:
            c.duration_months != null
              ? String(c.duration_months)
              : c.contract_months_count != null
                ? String(c.contract_months_count)
                : '',
          total_hours_contracted:
            c.total_hours_contracted != null ? String(c.total_hours_contracted) : '',
          installment_amount: c.installment_amount
            ? formatCurrencyInput(
                String(Math.round(parseFloat(c.installment_amount) * 100))
              )
            : '',
          installments_count:
            c.installments_count != null ? String(c.installments_count) : '',
          total_value: c.total_value
            ? formatCurrencyInput(String(Math.round(parseFloat(c.total_value) * 100)))
            : '',
          status: c.status || 'ativo',
          end_date: isoToDdMmYyyy(c.end_date),
        });
      } else {
        setFormData({ ...EMPTY_FORM });
      }
    }
  }, [open, contractToEdit]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const response = await api.get('/clients');
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else if (response.data?.clients) {
        setClients(response.data.clients);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const computedBodyShopHours = (): number => {
    const m = parseFloat(formData.monthly_hours_estimated) || 0;
    const mo = parseInt(formData.contract_months_count, 10) || 0;
    return m * mo;
  };

  const computedParceladoTotal = (): number => {
    const part = unformatCurrency(formData.installment_amount || '0');
    const n = parseInt(formData.installments_count, 10) || 0;
    return part * n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.contract_type) {
        alert('Selecione o tipo de contrato.');
        setLoading(false);
        return;
      }
      if (!formData.payment_method) {
        alert('Selecione a forma de pagamento.');
        setLoading(false);
        return;
      }

      let totalValue = unformatCurrency(formData.total_value);
      if (formData.payment_method === 'parcelado') {
        totalValue = computedParceladoTotal();
      }

      if (totalValue <= 0) {
        alert('O valor total do contrato deve ser maior que zero.');
        setLoading(false);
        return;
      }

      let endDateISO: string;
      try {
        endDateISO = parseDateToISO(formData.end_date);
      } catch {
        alert('Por favor, insira uma data de vencimento válida no formato dd/mm/yyyy.');
        setLoading(false);
        return;
      }

      let totalHoursContracted: number | undefined;
      if (formData.contract_type === 'body_shop_recorrente') {
        totalHoursContracted = computedBodyShopHours();
        if (totalHoursContracted <= 0) {
          alert('Informe horas mensais estimadas e quantidade de meses válidos.');
          setLoading(false);
          return;
        }
      } else if (
        formData.contract_type === 'time_material' ||
        formData.contract_type === 'projeto'
      ) {
        totalHoursContracted = parseFloat(formData.total_hours_contracted) || 0;
        if (totalHoursContracted <= 0) {
          alert('Informe o total de horas contratadas.');
          setLoading(false);
          return;
        }
      }

      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        client_id: formData.client_id,
        responsible_name: formData.responsible_name.trim(),
        contract_type: formData.contract_type,
        payment_method: formData.payment_method,
        total_value: String(totalValue),
        status: formData.status,
        end_date: endDateISO,
      };

      if (formData.contract_type === 'body_shop_recorrente') {
        payload.estimated_monthly_hours = parseFloat(formData.monthly_hours_estimated) || 0;
        payload.duration_months = parseInt(formData.contract_months_count, 10) || 0;
        payload.total_hours_contracted = totalHoursContracted;
      } else {
        payload.total_hours_contracted = totalHoursContracted;
      }

      if (formData.payment_method === 'parcelado') {
        payload.installment_amount = unformatCurrency(formData.installment_amount || '0');
        payload.installments_count = parseInt(formData.installments_count, 10) || 0;
      }

      if (isEdit && contractToEdit) {
        await api.put(`/contracts/${contractToEdit.id}`, payload);
      } else {
        await api.post('/contracts', payload);
      }

      setFormData({ ...EMPTY_FORM });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Erro ao salvar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Contrato' : 'Criar Novo Contrato'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados do contrato.'
              : 'Preencha os dados do novo contrato de consultoria.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Contrato *</Label>
              <Input
                id="name"
                placeholder="Ex: Desenvolvimento Sistema ERP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
                disabled={loadingClients}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingClients
                        ? 'Carregando clientes...'
                        : clients.length === 0
                          ? 'Nenhum cliente disponível'
                          : 'Selecione um cliente'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingClients &&
                    clients.length > 0 &&
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="responsible_name">Nome do Responsável *</Label>
              <Input
                id="responsible_name"
                placeholder="Ex: João Silva"
                value={formData.responsible_name}
                onChange={(e) =>
                  setFormData({ ...formData, responsible_name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Tipo de Contrato *</Label>
              <Select
                value={formData.contract_type || undefined}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    contract_type: value as ContractTypeCode,
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="body_shop_recorrente">Body Shop - Recorrente</SelectItem>
                  <SelectItem value="time_material">Time & Material</SelectItem>
                  <SelectItem value="projeto">Projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.contract_type === 'body_shop_recorrente' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="monthly_hours_estimated">Horas mensais estimadas *</Label>
                  <Input
                    id="monthly_hours_estimated"
                    type="number"
                    min={0}
                    step={0.5}
                    value={formData.monthly_hours_estimated}
                    onChange={(e) =>
                      setFormData({ ...formData, monthly_hours_estimated: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contract_months_count">Quantidade de meses *</Label>
                  <Input
                    id="contract_months_count"
                    type="number"
                    min={1}
                    value={formData.contract_months_count}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_months_count: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="rounded-md bg-muted/80 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total de horas contratadas (calculado): </span>
                  <span className="font-medium">{computedBodyShopHours() || '—'}</span>
                </div>
              </>
            )}

            {(formData.contract_type === 'time_material' ||
              formData.contract_type === 'projeto') && (
              <div className="grid gap-2">
                <Label htmlFor="total_hours_contracted">Total de horas contratadas *</Label>
                <Input
                  id="total_hours_contracted"
                  type="number"
                  min={0}
                  step={0.5}
                  value={formData.total_hours_contracted}
                  onChange={(e) =>
                    setFormData({ ...formData, total_hours_contracted: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Forma de Pagamento *</Label>
              <Select
                value={formData.payment_method || undefined}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    payment_method: value as 'a_vista' | 'parcelado',
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_vista">À vista</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payment_method === 'a_vista' && (
              <div className="grid gap-2">
                <Label htmlFor="total_value">Valor Total (R$) *</Label>
                <Input
                  id="total_value"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.total_value}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setFormData({ ...formData, total_value: formatted });
                  }}
                  required
                />
              </div>
            )}

            {formData.payment_method === 'parcelado' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="installment_amount">Valor da parcela (R$) *</Label>
                  <Input
                    id="installment_amount"
                    type="text"
                    placeholder="R$ 0,00"
                    value={formData.installment_amount}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData({ ...formData, installment_amount: formatted });
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="installments_count">Número de parcelas *</Label>
                  <Input
                    id="installments_count"
                    type="number"
                    min={1}
                    value={formData.installments_count}
                    onChange={(e) =>
                      setFormData({ ...formData, installments_count: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="rounded-md bg-muted/80 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Valor Total (R$) (calculado): </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(computedParceladoTotal())}
                  </span>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="a_vencer">A Vencer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end_date">Data de Vencimento (dd/mm/yyyy) *</Label>
              <Input
                id="end_date"
                type="text"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={formData.end_date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, end_date: formatted });
                }}
                required
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
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
