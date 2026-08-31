'use client';

import { useState } from 'react';
import { Pencil, Trash2, Repeat, Zap, CheckCircle2, Clock, ArrowDownUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { currency, formatDate, Entry, FilterKey } from '@/lib/types';

interface EntriesTableProps {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (entry: Entry) => void;
}

const filters: { key: FilterKey; label: string; dotColor?: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'recebidos', label: 'Apenas Recebidos', dotColor: 'bg-emerald-400' },
  { key: 'pendente_recebido', label: 'Apenas A Receber', dotColor: 'bg-amber-400' },
  { key: 'recorrentes', label: 'Recorrentes (Mensalidades)', dotColor: 'bg-emerald-400' },
  { key: 'avulsos', label: 'Trabalhos Avulsos', dotColor: 'bg-indigo-400' },
];

const matchFilter = (e: Entry, f: FilterKey): boolean => {
  switch (f) {
    case 'recebidos':
      return e.status === 'recebido';
    case 'pendente_recebido':
      return e.status === 'a_receber';
    case 'recorrentes':
      return e.type === 'recorrente';
    case 'avulsos':
      return e.type === 'avulso';
    default:
      return true;
  }
};

export function EntriesTable({
  entries,
  onEdit,
  onDelete,
  onToggleStatus,
}: EntriesTableProps) {
  const [filter, setFilter] = useState<FilterKey>('todos');

  const filtered = entries.filter((e) => matchFilter(e, filter));

  const filteredTotal = filtered.reduce((acc, e) => acc + e.value, 0);
  const filteredReceived = filtered
    .filter((e) => e.status === 'recebido')
    .reduce((acc, e) => acc + e.value, 0);

  return (
    <Card className="border-border/60 bg-card/50 p-0 overflow-hidden shadow-sm">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 bg-secondary/10">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                filter === f.key
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/40 font-semibold'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {f.dotColor && (
                <span className={cn('h-2 w-2 rounded-full', f.dotColor)} />
              )}
              {f.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> lançamentos encontrados
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Origem / Descrição</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Status (Clique p/ alternar)</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  <p className="text-sm font-medium">Nenhum lançamento encontrado para este filtro.</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">
                    Cadastre uma nova entrada para começar a acompanhar seu fluxo.
                  </p>
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="group border-b border-border/40 transition-colors hover:bg-secondary/30"
              >
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground font-mono text-xs">
                  {formatDate(e.date)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-medium text-foreground">
                    {e.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.client}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      e.type === 'recorrente'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
                    )}
                  >
                    {e.type === 'recorrente' ? (
                      <Repeat className="h-3 w-3" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    {e.type === 'recorrente' ? 'Recorrente' : 'Avulso'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onToggleStatus && onToggleStatus(e)}
                    title="Clique para alternar o status"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:scale-105 cursor-pointer',
                      e.status === 'recebido'
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                        : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                    )}
                  >
                    {e.status === 'recebido' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {e.status === 'recebido' ? 'Recebido' : 'A Receber'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-primary font-mono">
                  + {currency(e.value)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(e)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(e.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/60 bg-secondary/30 font-medium text-xs">
                <td colSpan={3} className="px-4 py-3 text-muted-foreground">
                  Subtotal filtrado
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Recebido: <span className="font-semibold text-primary">{currency(filteredReceived)}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground font-mono">
                  Total: {currency(filteredTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}
