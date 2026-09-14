'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Entry, EntryStatus, EntryType, NewEntryInput, currency, parseLocalDate } from '@/lib/types';
import { Calendar, Sparkles, CheckCircle2, Clock, Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Entry | null;
  defaultClient?: string;
  clientSuggestions?: string[];
  onSave: (input: NewEntryInput, id?: string) => void;
}

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyForm: NewEntryInput = {
  description: '',
  client: '',
  value: 0,
  type: 'avulso',
  status: 'a_receber',
  date: getTodayString(),
  contractMonths: 12,
};

export function EntryDialog({
  open,
  onOpenChange,
  editing,
  defaultClient,
  clientSuggestions = [],
  onSave,
}: EntryDialogProps) {
  const [form, setForm] = useState<NewEntryInput>(emptyForm);

  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        client: editing.client,
        value: editing.value,
        type: editing.type,
        status: editing.status,
        date: editing.date.slice(0, 10),
        contractMonths: 1,
      });
    } else {
      setForm({
        ...emptyForm,
        client: defaultClient || '',
      });
    }
  }, [editing, defaultClient, open]);

  const update = <K extends keyof NewEntryInput>(
    key: K,
    val: NewEntryInput[K]
  ) => setForm((f) => ({ ...f, [key]: val }));

  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiFill = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const customKey = localStorage.getItem('cf_custom_gemini_key') || undefined;
      const today = getTodayString();
      const prompt = `O usuário quer ${editing ? 'editar' : 'adicionar'} um lançamento. Hoje é ${today}.
Texto do usuário: "${aiInput}".
${editing ? `\nDados atuais (atualize o que o usuário pedir e mantenha o resto): ${JSON.stringify(form)}` : ''}

Lembre-se da regra 5: Retorne APENAS a tag [ADD_ENTRY:{...}] no final da resposta com os dados estruturados. Para 'contractMonths', use 0 para 'Indeterminado' (sem limite de tempo).`;

      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          mode: 'mentor_geral',
          customApiKey: customKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const match = data.reply.match(/\[ADD_ENTRY:(.+?)\]/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        setForm((prev) => ({ ...prev, ...parsed }));
        toast.success('Campos preenchidos pela IA! Verifique e salve.');
        setAiInput('');
      } else {
        toast.error('A IA não conseguiu extrair os dados. Tente ser mais claro.');
      }
    } catch (err: any) {
      toast.error('Erro na IA: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.description.trim() || form.value <= 0) return;
    onSave(form, editing?.id);
    onOpenChange(false);
  };

  // Cálculo da projeção do contrato
  const contractSummary = useMemo(() => {
    if (form.type !== 'recorrente' || editing) return null;
    if (form.contractMonths === 0) {
      return {
        months: 'Indeterminado',
        totalContract: 0,
        periodText: 'A partir de ' + new Date(parseLocalDate(form.date).year, parseLocalDate(form.date).month, parseLocalDate(form.date).day).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      };
    }
    const months = form.contractMonths || 12;
    const totalContract = (form.value || 0) * months;

    const { year, month, day } = parseLocalDate(form.date);
    const startDate = new Date(year, month, day);
    const endDate = new Date(year, month + months - 1, day);

    const formatShort = (d: Date) =>
      d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    return {
      months,
      totalContract,
      periodText: `${formatShort(startDate)} até ${formatShort(endDate)}`,
    };
  }, [form.type, form.contractMonths, form.value, form.date, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editing ? 'Editar Lançamento' : 'Novo Lançamento / Contrato'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Registre contratos de manutenção recorrente ou trabalhos avulsos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Assistente IA */}
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 mb-2">
            <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Bot className="h-4 w-4" />
              Preenchimento Mágico com IA
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={editing ? "Ex: Mude o valor para 400..." : "Ex: Fechei um contrato anual de 300 reais hoje com a loja do ze..."}
                className="bg-background text-xs h-9"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiFill()}
                disabled={isAiLoading}
              />
              <Button
                size="sm"
                onClick={handleAiFill}
                disabled={isAiLoading || !aiInput.trim()}
                className="h-9 w-9 shrink-0 p-0"
              >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Descrição */}
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição do Serviço / Contrato</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Ex: Manutenção Mensal do Site"
              className="bg-secondary/40"
              autoFocus
            />
          </div>

          {/* Cliente */}
          <div className="grid gap-2">
            <Label htmlFor="client">Cliente / Empresa / Fonte</Label>
            <Input
              id="client"
              list="client-suggestions"
              value={form.client}
              onChange={(e) => update('client', e.target.value)}
              placeholder="Ex: Barbearia Navalha"
              className="bg-secondary/40"
            />
            {clientSuggestions.length > 0 && (
              <datalist id="client-suggestions">
                {clientSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="value">
                {form.type === 'recorrente' ? 'Valor Mensal (R$)' : 'Valor Total (R$)'}
              </Label>
              <Input
                id="value"
                type="number"
                min={0}
                step="0.01"
                value={form.value || ''}
                onChange={(e) => update('value', Number(e.target.value))}
                placeholder="70,00"
                className="bg-secondary/40 font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">
                {form.type === 'recorrente' ? 'Data da 1ª Cobrança' : 'Data de Entrada'}
              </Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="bg-secondary/40"
              />
            </div>
          </div>

          {/* Switch Recorrente */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">Contrato Recorrente / Mensalidade</Label>
              <span className="text-xs text-muted-foreground">
                Gera as mensalidades automáticas ao longo do contrato
              </span>
            </div>
            <Switch
              checked={form.type === 'recorrente'}
              onCheckedChange={(c) =>
                update('type', (c ? 'recorrente' : 'avulso') as EntryType)
              }
            />
          </div>

          {/* Duração do Contrato (se for Recorrente) */}
          {form.type === 'recorrente' && !editing && (
            <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  Duração do Contrato
                </Label>
                <span className="text-xs font-medium text-emerald-400">
                  {form.contractMonths === 0 ? 'Tempo Indeterminado' : `${form.contractMonths ?? 12} meses`}
                </span>
              </div>

              {/* Botões de atalho rápido */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '6 meses', val: 6 },
                  { label: '12 meses', val: 12 },
                  { label: '24 meses', val: 24 },
                  { label: 'Sem Limite', val: 0 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => update('contractMonths', item.val)}
                    className={`rounded-lg py-2 px-2 text-xs font-medium transition-all ${
                      form.contractMonths === item.val
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-bold'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Resumo inteligente da projeção */}
              {contractSummary && (
                <div className="rounded-lg border border-emerald-500/20 bg-background/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Resumo do Contrato:
                  </p>
                  <p>
                    • <strong className="text-foreground">{contractSummary.months} mensalidades</strong> de{' '}
                    <strong className="text-emerald-400">{currency(form.value || 0)}</strong>
                  </p>
                  <p>
                    • Período: <strong className="text-foreground">{contractSummary.periodText}</strong>
                  </p>
                  <p>
                    • Valor total do contrato: <strong className="text-primary font-mono">{currency(contractSummary.totalContract)}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Switch Status inicial */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">Status da 1ª Parcela</Label>
              <span className="text-xs text-muted-foreground">
                {form.status === 'recebido'
                  ? 'Primeiro mês já foi recebido'
                  : 'Aguardando pagamento'}
              </span>
            </div>
            <Switch
              checked={form.status === 'recebido'}
              onCheckedChange={(c) =>
                update(
                  'status',
                  (c ? 'recebido' : 'a_receber') as EntryStatus
                )
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {editing ? 'Salvar Alterações' : 'Criar Lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
