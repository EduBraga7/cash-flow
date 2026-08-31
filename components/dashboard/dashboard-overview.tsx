'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Entry, currency, formatDate, parseLocalDate } from '@/lib/types';
import {
  TrendingUp,
  RefreshCw,
  Wallet,
  Clock,
  CheckCircle2,
  Users,
  Zap,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardOverviewProps {
  entries: Entry[];
  onNavigate: (page: 'entradas') => void;
  onNewEntry: () => void;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function DashboardOverview({ entries, onNavigate, onNewEntry }: DashboardOverviewProps) {
  const currentRealYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);

  // Lista dinâmica de anos disponíveis
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentRealYear, currentRealYear + 1]);
    entries.forEach((e) => {
      const { year } = parseLocalDate(e.date);
      if (year && year >= 2020 && year <= 2035) {
        yearsSet.add(year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [entries, currentRealYear]);

  // 1. Cálculos de KPIs Globais e do Ano
  const stats = useMemo(() => {
    const receivedEntries = entries.filter((e) => e.status === 'recebido');
    const pendingEntries = entries.filter((e) => e.status === 'a_receber');

    const totalReceived = receivedEntries.reduce((acc, e) => acc + e.value, 0);
    const totalPending = pendingEntries.reduce((acc, e) => acc + e.value, 0);

    // Contratos recorrentes ativos (MRR por cliente/contrato único)
    const recurringMap = new Map<string, number>();
    entries
      .filter((e) => e.type === 'recorrente')
      .forEach((e) => {
        const key = e.client.trim().toLowerCase();
        // Guarda o valor mensal da assinatura deste cliente
        if (!recurringMap.has(key)) {
          recurringMap.set(key, e.value);
        }
      });

    const recurringMonthly = Array.from(recurringMap.values()).reduce((acc, v) => acc + v, 0);
    const recurringAnnualProjected = recurringMonthly * 12;

    const currentMonth = new Date().getMonth();

    const thisMonthReceived = receivedEntries
      .filter((e) => {
        const { year, month } = parseLocalDate(e.date);
        return month === currentMonth && year === currentRealYear;
      })
      .reduce((acc, e) => acc + e.value, 0);

    const totalAvulso = entries
      .filter((e) => e.type === 'avulso' && e.status === 'recebido')
      .reduce((acc, e) => acc + e.value, 0);

    return {
      totalReceived,
      totalPending,
      recurringMonthly,
      recurringAnnualProjected,
      thisMonthReceived,
      totalAvulso,
      receivedCount: receivedEntries.length,
      pendingCount: pendingEntries.length,
    };
  }, [entries, currentRealYear]);

  // Totais do ano selecionado (para cabeçalho do gráfico)
  const selectedYearSummary = useMemo(() => {
    let yearReceived = 0;
    let yearPending = 0;

    entries.forEach((e) => {
      const { year } = parseLocalDate(e.date);
      if (year === selectedYear) {
        if (e.status === 'recebido') {
          yearReceived += e.value;
        } else {
          yearPending += e.value;
        }
      }
    });

    return {
      received: yearReceived,
      pending: yearPending,
      total: yearReceived + yearPending,
    };
  }, [entries, selectedYear]);

  // 2. Dados para o gráfico do ano selecionado
  const monthlyChartData = useMemo(() => {
    const data = MONTH_NAMES.map((month, idx) => ({
      month,
      monthIndex: idx,
      recorrente_recebido: 0,
      avulso_recebido: 0,
      a_receber: 0,
      total: 0,
    }));

    entries.forEach((e) => {
      const { year, month } = parseLocalDate(e.date);
      if (year === selectedYear && month >= 0 && month < 12) {
        if (e.status === 'recebido') {
          if (e.type === 'recorrente') {
            data[month].recorrente_recebido += e.value;
          } else {
            data[month].avulso_recebido += e.value;
          }
        } else {
          data[month].a_receber += e.value;
        }

        data[month].total += e.value;
      }
    });

    return data;
  }, [entries, selectedYear]);

  // 3. Ranking de Clientes / Fontes
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; recurring: boolean }>();

    entries.forEach((e) => {
      const clientName = e.client.trim() || 'Cliente Não Identificado';
      const current = map.get(clientName) || {
        name: clientName,
        total: 0,
        count: 0,
        recurring: false,
      };

      current.total += e.value;
      current.count += 1;
      if (e.type === 'recorrente') current.recurring = true;

      map.set(clientName, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [entries]);

  // 4. Últimos lançamentos
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const timeA = parseLocalDate(a.date).date.getTime();
        const timeB = parseLocalDate(b.date).date.getTime();
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [entries]);

  const handlePrevYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex < availableYears.length - 1 && currentIndex >= 0) {
      setSelectedYear(availableYears[currentIndex + 1]);
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Main Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Recebido */}
        <Card className="border-border/60 bg-card/60 relative overflow-hidden transition-all hover:border-primary/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Já Recebido
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {currency(stats.totalReceived)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 inline" />
              {stats.receivedCount} lançamentos liquidados
            </p>
          </CardContent>
        </Card>

        {/* Recorrente Mensal (MRR) */}
        <Card className="border-border/60 bg-card/60 relative overflow-hidden transition-all hover:border-primary/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recorrente Mensal (MRR)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <RefreshCw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currency(stats.recurringMonthly)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/mês</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currency(stats.recurringAnnualProjected)} anualizado
            </p>
          </CardContent>
        </Card>

        {/* Entrou este mês */}
        <Card className="border-border/60 bg-card/60 relative overflow-hidden transition-all hover:border-primary/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-cyan-500/10 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Entrou no Mês Atual
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currency(stats.thisMonthReceived)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Competência {MONTH_NAMES[new Date().getMonth()]}/{new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>

        {/* Pendente / A Receber */}
        <Card className="border-border/60 bg-card/60 relative overflow-hidden transition-all hover:border-primary/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendente a Receber
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {currency(stats.totalPending)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.pendingCount} parcelas futuras ou em aberto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ÚNICO GRÁFICO UNIFICADO COM NAVEGAÇÃO POR ANO */}
      <Card className="border-border/60 bg-card/60 shadow-sm w-full">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                Evolução Mensal & Previsão — Ano {selectedYear}
              </CardTitle>
              {selectedYear === currentRealYear && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/30">
                  Ano Atual
                </span>
              )}
            </div>
            <CardDescription className="mt-1 text-xs">
              Previsão de <strong className="text-foreground">{currency(selectedYearSummary.total)}</strong> para o ano de {selectedYear}{' '}
              ({currency(selectedYearSummary.received)} realizado +{' '}
              <span className="text-amber-400 font-medium">{currency(selectedYearSummary.pending)} previsto</span>)
            </CardDescription>
          </div>

          {/* Navegador de Ano & Legenda */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-secondary/30 p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevYear}
                title="Ano Anterior"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-1">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      selectedYear === year
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextYear}
                title="Próximo Ano"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Legenda Resumida */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/30 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Recorrente
              </span>
              <span className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/30 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Avulso
              </span>
              <span className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/30 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                A Receber
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    const monthData = payload[0]?.payload;
                    const rec = monthData?.recorrente_recebido || 0;
                    const avulso = monthData?.avulso_recebido || 0;
                    const pend = monthData?.a_receber || 0;
                    const total = monthData?.total || 0;

                    return (
                      <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[200px]">
                        <p className="font-semibold text-foreground mb-2 pb-1 border-b border-border/50">
                          {label} de {selectedYear}
                        </p>

                        <div className="space-y-1.5">
                          {rec > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Recorrente Recebido:
                              </span>
                              <span className="font-mono font-semibold text-emerald-400">
                                {currency(rec)}
                              </span>
                            </div>
                          )}

                          {avulso > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                                Avulso Recebido:
                              </span>
                              <span className="font-mono font-semibold text-indigo-400">
                                {currency(avulso)}
                              </span>
                            </div>
                          )}

                          {pend > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                A Receber (Previsão):
                              </span>
                              <span className="font-mono font-semibold text-amber-400">
                                {currency(pend)}
                              </span>
                            </div>
                          )}

                          {total === 0 && (
                            <p className="text-muted-foreground italic">Nenhum lançamento previsto para este mês</p>
                          )}
                        </div>

                        <div className="border-t border-border/60 pt-1.5 mt-2.5 flex items-center justify-between gap-4 font-bold text-foreground">
                          <span>Total do Mês:</span>
                          <span className="text-primary font-mono">{currency(total)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  formatter={(val) => {
                    if (val === 'recorrente_recebido')
                      return <span className="text-xs text-emerald-400 font-medium mr-3">Recorrente Recebido</span>;
                    if (val === 'avulso_recebido')
                      return <span className="text-xs text-indigo-400 font-medium mr-3">Avulso Recebido</span>;
                    if (val === 'a_receber')
                      return <span className="text-xs text-amber-400 font-medium mr-1">A Receber (Previsão)</span>;
                    return val;
                  }}
                />

                {/* Barras Empilhadas Elegantes */}
                <Bar
                  dataKey="recorrente_recebido"
                  name="recorrente_recebido"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="avulso_recebido"
                  name="avulso_recebido"
                  fill="#6366f1"
                  radius={[0, 0, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="a_receber"
                  name="a_receber"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Maiores Clientes & Últimos Lançamentos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Principais Clientes / Fontes */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Principais Fontes & Clientes
              </CardTitle>
              <CardDescription>
                Clientes com maior volume financeiro gerado
              </CardDescription>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Nenhum cliente registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, idx) => (
                  <div
                    key={client.name}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.count} {client.count === 1 ? 'lançamento' : 'lançamentos'}
                          {client.recurring && ' · Mensalista fixo'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-primary font-mono">
                        {currency(client.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Transações */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Extrato Recente
              </CardTitle>
              <CardDescription>
                Últimas movimentações registradas
              </CardDescription>
            </div>
            <button
              onClick={() => onNavigate('entradas')}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Nenhum lançamento adicionado ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentEntries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          e.type === 'recorrente'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-indigo-500/15 text-indigo-400'
                        }`}
                      >
                        {e.type === 'recorrente' ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {e.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.client} · {formatDate(e.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-primary font-mono">
                        + {currency(e.value)}
                      </p>
                      <span
                        className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                          e.status === 'recebido'
                            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                        }`}
                      >
                        {e.status === 'recebido' ? 'Recebido' : 'A Receber'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
