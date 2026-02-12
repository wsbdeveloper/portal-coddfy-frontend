/**
 * Dialog para criar/editar timesheet
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
import { Timesheet, Contract, Consultant } from '@/types';
import api from '@/lib/api';
import { formatDateInput, parseDateToISO } from '@/lib/format';

interface CreateTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  timesheet?: Timesheet | null;
}

export default function CreateTimesheetDialog({
  open,
  onOpenChange,
  onSuccess,
  timesheet,
}: CreateTimesheetDialogProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [filteredConsultants, setFilteredConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    contract_id: '',
    consultant_id: '',
    file_url: '',
    hours: '',
    approver: '',
    approval_date: '',
  });

  const isEdit = !!timesheet;

  useEffect(() => {
    if (open) {
      console.log('CreateTimesheetDialog: Abrindo dialog', { isEdit, timesheet });
      setError(null);
      
      // Só buscar dados se ainda não foram carregados
      if (!dataLoaded && !loadingData) {
        setLoadingData(true);
        Promise.all([fetchContracts(), fetchConsultants()])
          .then(() => {
            setDataLoaded(true);
            setLoadingData(false);
          })
          .catch((err) => {
            console.error('Erro ao carregar dados:', err);
            setLoadingData(false);
          });
      }
      
      if (timesheet) {
        // Modo edição
        try {
          let approvalDateFormatted = '';
          if (timesheet.approval_date) {
            try {
              // Tenta formatar a data se estiver em formato ISO
              const dateStr = timesheet.approval_date.includes('T') 
                ? timesheet.approval_date.split('T')[0] 
                : timesheet.approval_date;
              // Converte de YYYY-MM-DD para DD/MM/YYYY
              const [year, month, day] = dateStr.split('-');
              if (year && month && day) {
                approvalDateFormatted = `${day}/${month}/${year}`;
              }
            } catch (e) {
              console.error('Erro ao formatar data:', e);
            }
          }
          
          setFormData({
            contract_id: timesheet.contract_id || '',
            consultant_id: timesheet.consultant_id || '',
            file_url: timesheet.file_url || '',
            hours: timesheet.hours?.toString() || '',
            approver: timesheet.approver || '',
            approval_date: approvalDateFormatted,
          });
        } catch (err) {
          console.error('Erro ao inicializar formulário de edição:', err);
          setFormData({
            contract_id: timesheet.contract_id || '',
            consultant_id: timesheet.consultant_id || '',
            file_url: timesheet.file_url || '',
            hours: timesheet.hours?.toString() || '',
            approver: timesheet.approver || '',
            approval_date: '',
          });
        }
      } else {
        // Modo criação - resetar formulário
        setFormData({
          contract_id: '',
          consultant_id: '',
          file_url: '',
          hours: '',
          approver: '',
          approval_date: '',
        });
        setSelectedFile(null);
      }
    } else {
      // Quando fechar, limpar arquivo selecionado
      setSelectedFile(null);
    }
  }, [open, timesheet, dataLoaded, loadingData]);

  // Filtrar consultores quando um contrato é selecionado
  useEffect(() => {
    try {
      if (formData.contract_id && consultants.length > 0) {
        const contractConsultants = consultants.filter(
          (c) => c.contract_id === formData.contract_id
        );
        setFilteredConsultants(contractConsultants);
        
        // Se o consultor atual não pertence ao contrato selecionado, limpar
        if (formData.consultant_id) {
          const currentConsultant = consultants.find(c => c.id === formData.consultant_id);
          if (currentConsultant && currentConsultant.contract_id !== formData.contract_id) {
            setFormData(prev => {
              if (prev.consultant_id === '') return prev; // Evita loop
              return { ...prev, consultant_id: '' };
            });
          }
        }
      } else {
        setFilteredConsultants([]);
      }
    } catch (err) {
      console.error('Erro ao filtrar consultores:', err);
      setFilteredConsultants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contract_id, consultants]);

  const fetchContracts = async (): Promise<void> => {
    try {
      console.log('CreateTimesheetDialog: Buscando contratos...');
      const response = await api.get('/contracts');
      console.log('CreateTimesheetDialog: Resposta de contratos:', response.data);
      const contractsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.contracts || []);
      console.log('CreateTimesheetDialog: Contratos processados:', contractsData.length);
      setContracts(contractsData);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar contratos:', err);
      setError('Erro ao carregar contratos. Tente novamente.');
      setContracts([]);
      throw err; // Re-throw para Promise.all capturar
    }
  };

  const fetchConsultants = async (): Promise<void> => {
    try {
      console.log('CreateTimesheetDialog: Buscando consultores...');
      const response = await api.get('/consultants');
      console.log('CreateTimesheetDialog: Resposta de consultores:', response.data);
      const groups = response.data?.groups || [];
      const allConsultants: Consultant[] = [];
      groups.forEach((group: any) => {
        if (group.consultants && Array.isArray(group.consultants)) {
          allConsultants.push(...group.consultants);
        }
      });
      console.log('CreateTimesheetDialog: Consultores processados:', allConsultants.length);
      setConsultants(allConsultants);
    } catch (err: any) {
      console.error('Erro ao carregar consultores:', err);
      // Não quebrar o componente se houver erro, apenas não mostrar consultores
      setConsultants([]);
      throw err; // Re-throw para Promise.all capturar
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFormData(prev => ({ ...prev, file_url: '' }));
      return;
    }

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('O arquivo é muito grande. Tamanho máximo: 10MB');
      e.target.value = ''; // Limpar input
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    // Limpar file_url quando selecionar novo arquivo (vai usar o arquivo, não URL)
    setFormData(prev => ({ ...prev, file_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contract_id) {
      alert('Por favor, selecione um contrato.');
      return;
    }

    // Validar se contract_id foi preenchido
    if (!formData.contract_id?.trim()) {
      alert('Por favor, selecione um contrato.');
      return;
    }

    // Validar se consultant_id pertence ao contrato selecionado (se fornecido)
    if (formData.consultant_id?.trim()) {
      const consultant = consultants.find(c => c.id === formData.consultant_id);
      if (consultant && consultant.contract_id !== formData.contract_id) {
        alert('O consultor selecionado não pertence ao contrato escolhido.');
        return;
      }
    }

    setLoading(true);

    try {
      // Se houver arquivo, enviar como multipart/form-data
      if (selectedFile) {
        const formDataToSend = new FormData();
        
        // contract_id é obrigatório
        formDataToSend.append('contract_id', formData.contract_id.trim());
        
        // consultant_id é opcional - só adicionar se tiver valor não vazio
        if (formData.consultant_id && formData.consultant_id.trim() !== '') {
          formDataToSend.append('consultant_id', formData.consultant_id.trim());
        }
        
        // Adicionar arquivo com o nome correto: timesheet_file (conforme curl example)
        formDataToSend.append('timesheet_file', selectedFile);
        
        // hours é opcional - só adicionar se tiver valor válido (número > 0)
        if (formData.hours && formData.hours.trim() !== '') {
          const hoursNum = parseFloat(formData.hours);
          if (!isNaN(hoursNum) && hoursNum > 0) {
            // Enviar como string numérica - o backend deve converter para float
            formDataToSend.append('hours', hoursNum.toString());
          }
        }
        
        // approver é opcional - só adicionar se tiver valor não vazio
        if (formData.approver && formData.approver.trim() !== '') {
          formDataToSend.append('approver', formData.approver.trim());
        }
        
        // approval_date é opcional - só adicionar se tiver valor válido
        if (formData.approval_date && formData.approval_date.trim() !== '') {
          try {
            // Converter para ISO string (YYYY-MM-DDTHH:mm:ssZ)
            const isoDate = parseDateToISO(formData.approval_date);
            formDataToSend.append('approval_date', isoDate);
          } catch (err: any) {
            alert('Por favor, insira uma data de aprovação válida no formato dd/mm/yyyy.');
            setLoading(false);
            return;
          }
        }

        // Log para debug
        console.log('Enviando FormData com arquivo:');
        console.log('- contract_id:', formData.contract_id);
        console.log('- consultant_id:', formData.consultant_id);
        console.log('- hours:', formData.hours);
        console.log('- approver:', formData.approver);
        console.log('- approval_date:', formData.approval_date);
        console.log('- file:', selectedFile.name, `(${(selectedFile.size / 1024).toFixed(2)} KB)`);
        
        // Verificar conteúdo do FormData
        for (const [key, value] of formDataToSend.entries()) {
          console.log(`FormData[${key}]:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
        }

        // Enviar FormData - garantir que seja passado corretamente
        console.log('Tipo de formDataToSend:', formDataToSend instanceof FormData ? 'FormData' : typeof formDataToSend);
        console.log('FormData tem arquivo?', formDataToSend.has('timesheet_file'));
        console.log('FormData entries:', Array.from(formDataToSend.entries()));
        
        // Garantir que o FormData seja passado diretamente sem transformação
        if (isEdit && timesheet) {
          const response = await api.put(`/timesheets/${timesheet.id}`, formDataToSend);
          console.log('Resposta do update:', response.data);
          alert('Timesheet atualizado com sucesso!');
        } else {
          const response = await api.post('/timesheets', formDataToSend);
          console.log('Resposta do create:', response.data);
          alert('Timesheet criado com sucesso!');
        }
      } else {
        // Se não houver arquivo, enviar como JSON
        const payload: any = {
          contract_id: formData.contract_id.trim(),
        };

        if (formData.consultant_id?.trim()) {
          payload.consultant_id = formData.consultant_id.trim();
        }
        if (formData.file_url?.trim()) {
          payload.file_url = formData.file_url.trim();
        }
        if (formData.hours?.trim()) {
          const hoursNum = parseFloat(formData.hours);
          if (!isNaN(hoursNum) && hoursNum > 0) {
            payload.hours = hoursNum;
          }
        }
        if (formData.approver?.trim()) {
          payload.approver = formData.approver.trim();
        }
        if (formData.approval_date?.trim()) {
          try {
            payload.approval_date = parseDateToISO(formData.approval_date);
          } catch (err: any) {
            alert('Por favor, insira uma data de aprovação válida no formato dd/mm/yyyy.');
            setLoading(false);
            return;
          }
        }

        console.log('Enviando payload JSON:', payload);

        if (isEdit && timesheet) {
          const response = await api.put(`/timesheets/${timesheet.id}`, payload);
          console.log('Resposta do update:', response.data);
          alert('Timesheet atualizado com sucesso!');
        } else {
          const response = await api.post('/timesheets', payload);
          console.log('Resposta do create:', response.data);
          alert('Timesheet criado com sucesso!');
        }
      }

      // Resetar formulário
      setFormData({
        contract_id: '',
        consultant_id: '',
        file_url: '',
        hours: '',
        approver: '',
        approval_date: '',
      });
      setSelectedFile(null);

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro completo ao salvar timesheet:', err);
      console.error('Status:', err.response?.status);
      console.error('Headers:', err.response?.headers);
      console.error('Data:', err.response?.data);
      
      let errorMsg = 'Erro ao salvar timesheet';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else {
          errorMsg = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  try {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Timesheet' : 'Criar Novo Timesheet'}</DialogTitle>
            <DialogDescription>
              {isEdit 
                ? 'Atualize as informações do timesheet'
                : 'Adicione um novo timesheet para um contrato'}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          {loadingData && (
            <div className="p-3 text-sm text-muted-foreground">
              Carregando dados...
            </div>
          )}
          <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contract_id">Contrato *</Label>
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
                      {contract.name} {contract.client && `- ${contract.client.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="consultant_id">Consultor (opcional)</Label>
              <Select
                value={formData.consultant_id || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, consultant_id: value })
                }
                disabled={!formData.contract_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.contract_id ? "Selecione um consultor (opcional)" : "Selecione um contrato primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredConsultants.length === 0 && formData.contract_id ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum consultor disponível para este contrato
                    </div>
                  ) : (
                    filteredConsultants.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id}>
                        {consultant.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!formData.contract_id && (
                <p className="text-xs text-muted-foreground">
                  Selecione um contrato primeiro para ver os consultores disponíveis
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file_upload">Anexar Arquivo (opcional)</Label>
              <Input
                id="file_upload"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  <br />
                  <span className="text-blue-600">O arquivo será enviado junto com o formulário.</span>
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file_url">Ou informe a URL do Arquivo (opcional)</Label>
              <Input
                id="file_url"
                type="url"
                placeholder="https://exemplo.com/arquivo.pdf"
                value={formData.file_url}
                onChange={(e) =>
                  setFormData({ ...formData, file_url: e.target.value })
                }
                disabled={!!selectedFile}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Você pode remover o arquivo selecionado acima para usar uma URL
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hours">Horas (opcional)</Label>
              <Input
                id="hours"
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 40"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="approver">Aprovador (opcional)</Label>
              <Input
                id="approver"
                placeholder="Nome do aprovador"
                value={formData.approver}
                onChange={(e) =>
                  setFormData({ ...formData, approver: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="approval_date">Data de Aprovação (opcional, dd/mm/yyyy)</Label>
              <Input
                id="approval_date"
                type="text"
                placeholder="dd/mm/yyyy"
                maxLength={10}
                value={formData.approval_date}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, approval_date: formatted });
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
              {loading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar' : 'Criar Timesheet')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  } catch (err: any) {
    console.error('Erro ao renderizar CreateTimesheetDialog:', err);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>
              Ocorreu um erro ao carregar o formulário. Por favor, tente novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-red-500">{err?.message || 'Erro desconhecido'}</p>
            <Button
              className="mt-4"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

