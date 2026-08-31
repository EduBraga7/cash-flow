'use client';

import { TrendingUp, RefreshCw, Wallet, Clock, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Entry, currency } from '@/lib/types';

interface MetricsCardsProps {
  entries: Entry[];
}

interface Metric {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  badge?: { text: string; tone: 'up' | 'neutral' | 'warn' };
}

const isThisMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export function MetricsCards({ entries }: MetricsCardsProps) {
  const monthIn = entries
    .filter((e) => e.status === 'recebido' && isThisMonth(e.date))
    .reduce((s, e) => s + e.value, 0);

  const recurringMap = new Map<string, number>();
  entries
    .filter((e) => e.type === 'recorrente')
    .forEach((e) => {
      const key = e.client.trim().toLowerCase();
      if (!recurringMap.has(key)) {
        recurringMap.set(key, e.value);
      }
    });
  const recurring = Array.from(recurringMap.values()).reduce((s, v) => s + v, 0);

  const total = entries
    .filter((e) => e.status === 'recebido')
    .reduce((s, e) => s + e.value, 0);

  const pending = entries
    .filter((e) => e.status === 'a_receber')
    .reduce((s, e) => s + e.value, 0);

  const metrics: Metric[] = [
    {
      label: 'Total Já Recebido',
      value: currency(total),
      sub: `${entries.filter((e) => e.status === 'recebido').length} lançamentos liquidados`,
      icon: Wallet,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
    },
    {
      label: 'Recorrente Garantido',
      value: currency(recurring),
      sub: 'por mês em mensalidades',
      icon: RefreshCw,
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Entrou este mês',
      value: currency(monthIn),
      sub: 'competência atual',
      icon: TrendingUp,
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-400',
    },
    {
      label: 'Pendente / A Receber',
      value: currency(pending),
      sub: 'valores futuros ou em aberto',
      icon: Clock,
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card
            key={m.label}
            className="group relative overflow-hidden border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40 shadow-sm"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:bg-primary/10" />
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border/50',
                  m.iconBg || 'bg-primary/10',
                  m.iconColor || 'text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {m.value}
            </p>
            {m.sub && (
              <p className="mt-1 text-xs text-muted-foreground">
                {m.sub}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
