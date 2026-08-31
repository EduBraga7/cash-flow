'use client';

import { useState, useRef, useEffect, useMemo, ReactNode } from 'react';
import { Entry, ClientProject, TaskDemand, SnippetResource, currency } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  TrendingUp,
  Target,
  Briefcase,
  ListTodo,
  Key,
  Copy,
  Check,
  Zap,
  DollarSign,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  FileText,
  Calculator,
  UserCheck,
  Code2,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AIAdvisorViewProps {
  entries: Entry[];
  clients: ClientProject[];
  tasks: TaskDemand[];
  snippets: SnippetResource[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode?: string;
  createdAt: string;
}

type StrategicMode = 'mentor_geral' | 'cfo' | 'comercial' | 'tech_lead';

/**
 * Componente que renderiza texto em Markdown com formatação visual limpa (sem asteriscos '**' crus)
 */
function MarkdownFormattedText({ text }: { text: string }) {
  const lines = text.split('\n');

  // Parser de linha inline para negrito, código e ênfase
  const parseInline = (lineText: string): ReactNode[] => {
    // Regex para **negrito**, `código`, *itálico*
    const parts: ReactNode[] = [];
    let remaining = lineText;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. **Negrito**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // 2. `Código`
      const codeMatch = remaining.match(/`(.+?)`/);

      let firstMatchIndex = Infinity;
      let matchType: 'bold' | 'code' | null = null;
      let matchedString = '';
      let innerText = '';

      if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstMatchIndex) {
        firstMatchIndex = boldMatch.index;
        matchType = 'bold';
        matchedString = boldMatch[0];
        innerText = boldMatch[1];
      }

      if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstMatchIndex) {
        firstMatchIndex = codeMatch.index;
        matchType = 'code';
        matchedString = codeMatch[0];
        innerText = codeMatch[1];
      }

      if (matchType && firstMatchIndex !== Infinity) {
        // Texto antes do match
        if (firstMatchIndex > 0) {
          parts.push(remaining.substring(0, firstMatchIndex));
        }

        if (matchType === 'bold') {
          parts.push(
            <strong key={`b-${keyIdx++}`} className="font-semibold text-foreground">
              {innerText}
            </strong>
          );
        } else if (matchType === 'code') {
          parts.push(
            <code
              key={`c-${keyIdx++}`}
              className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[11px] text-primary"
            >
              {innerText}
            </code>
          );
        }

        remaining = remaining.substring(firstMatchIndex + matchedString.length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  return (
    <div className="space-y-1.5 leading-relaxed font-sans text-xs sm:text-[13px]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Linha vazia
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Divisórias ---
        if (trimmed.startsWith('---') || trimmed.startsWith('===') || trimmed === '___') {
          return <hr key={idx} className="my-2 border-border/40" />;
        }

        // Títulos ## ou ### ou #
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-sm sm:text-base font-bold text-foreground mt-2 mb-1">
              {parseInline(trimmed.replace(/^#\s+/, ''))}
            </h2>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-bold text-foreground mt-2 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {parseInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-foreground/90 mt-1.5 mb-0.5">
              {parseInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Tópicos com bullet (•, -, *)
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^([•\-\*])\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
              <span className="text-primary mt-0.5 shrink-0 text-sm leading-none">•</span>
              <div className="flex-1">{parseInline(content)}</div>
            </div>
          );
        }

        // Listas numeradas (1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
              <span className="font-bold text-primary text-[11px] shrink-0">{num}.</span>
              <div className="flex-1">{parseInline(content)}</div>
            </div>
          );
        }

        // Citações ou Blocos de WhatsApp (> )
        if (trimmed.startsWith('> ')) {
          const quote = trimmed.replace(/^>\s+/, '');
          return (
            <div
              key={idx}
              className="my-1.5 rounded-lg border-l-2 border-primary bg-secondary/40 p-2.5 text-muted-foreground text-xs italic"
            >
              {parseInline(quote)}
            </div>
          );
        }

        // Linha normal
        return <p key={idx}>{parseInline(line)}</p>;
      })}
    </div>
  );
}

export function AIAdvisorView({
  entries,
  clients,
  tasks,
  snippets,
}: AIAdvisorViewProps) {
  const [activeMode, setActiveMode] = useState<StrategicMode>('mentor_geral');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Olá! Sou seu Consultor Estratégico de Negócios e Mentor Digital. 🧠🚀

Já carreguei todo o raio-x da sua empresa:
• Faturamento Total: ${currency(entries.reduce((a, b) => a + b.value, 0))}
• MRR Atual: ${currency(
        Array.from(
          entries
            .filter((e) => e.type === 'recorrente')
            .reduce((map, e) => {
              const k = e.client.trim().toLowerCase();
              if (!map.has(k) || e.value > (map.get(k) || 0)) map.set(k, e.value);
              return map;
            }, new Map<string, number>())
            .values()
        ).reduce((a, b) => a + b, 0)
      )}/mês (cliente XK Eventos)
• Cases Ativos: Said Climatização, Odonto Braga e XK Eventos
• Quadro Kanban: ${tasks.filter((t) => t.status !== 'done').length} demandas em andamento

Selecione um Modo Estratégico acima ou clique nas ações rápidas para destravar novos clientes e acelerar seus ganhos!`,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<'vendas' | 'financeiro' | 'relatorios' | 'simulador'>('vendas');

  // Key Manager Modal
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cf_custom_gemini_key') || '';
    }
    return '';
  });
  const [tempKeyInput, setTempKeyInput] = useState(customKey);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Análise detalhada dos dados do negócio
  const businessAnalysis = useMemo(() => {
    const totalValue = entries.reduce((acc, e) => acc + e.value, 0);
    const receivedValue = entries
      .filter((e) => e.status === 'recebido')
      .reduce((acc, e) => acc + e.value, 0);
    const pendingValue = entries
      .filter((e) => e.status === 'a_receber')
      .reduce((acc, e) => acc + e.value, 0);

    // MRR por cliente
    const recurringMap = new Map<string, number>();
    entries
      .filter((e) => e.type === 'recorrente')
      .forEach((e) => {
        const clientKey = e.client.trim().toLowerCase();
        if (!recurringMap.has(clientKey) || e.value > (recurringMap.get(clientKey) || 0)) {
          recurringMap.set(clientKey, e.value);
        }
      });
    const mrr = Array.from(recurringMap.values()).reduce((acc, v) => acc + v, 0);
    const recurringClientsCount = recurringMap.size;

    // Clientes sem recorrência (cases de portfólio)
    const portfolioWithoutRecurring = clients.filter(
      (c) => c.category === 'portfolio' && !recurringMap.has(c.name.trim().toLowerCase())
    );

    // Kanban stats
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    const urgentTasks = tasks.filter((t) => t.status !== 'done' && (t.priority === 'urgente' || t.priority === 'alta'));

    return {
      totalValue,
      receivedValue,
      pendingValue,
      mrr,
      arr: mrr * 12,
      recurringClientsCount,
      portfolioWithoutRecurring,
      pendingTasks,
      urgentTasks,
      clients: clients.map((c) => ({
        name: c.name,
        category: c.category,
        siteUrl: c.siteUrl,
        githubUrl: c.githubUrl,
        notes: c.notes,
      })),
      tasks: tasks.map((t) => ({
        title: t.title,
        client: t.client,
        status: t.status,
        priority: t.priority,
      })),
      snippets: snippets.map((s) => ({
        title: s.title,
        category: s.category,
      })),
    };
  }, [entries, clients, tasks, snippets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string, modeOverride?: StrategicMode) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || loading) return;

    const mode = modeOverride || activeMode;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
      mode,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode,
          history: historyPayload,
          businessContext: businessAnalysis,
          customApiKey: customKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consultar a IA.');
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        mode,
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Erro na chamada da IA:', err);
      toast.error(err.message || 'Erro ao conectar com a IA do Gemini.');
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'model',
          text: `⚠️ Ops, ocorreu um erro ao gerar a resposta: ${err.message}. Verifique sua chave de API ou tente novamente em instantes.`,
          createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomKey = () => {
    const trimmed = tempKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('cf_custom_gemini_key', trimmed);
      setCustomKey(trimmed);
      toast.success('Chave de API salva com sucesso!');
    } else {
      localStorage.removeItem('cf_custom_gemini_key');
      setCustomKey('');
      toast.info('Utilizando a chave padrão do sistema.');
    }
    setKeyModalOpen(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado para a área de transferência! 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Modos de Persona
  const personaModes = [
    {
      id: 'mentor_geral' as StrategicMode,
      label: '🧠 Mentor Geral (360°)',
      desc: 'Visão executiva integrada de crescimento e gestão.',
      color: 'bg-primary/20 text-primary ring-primary/40',
    },
    {
      id: 'cfo' as StrategicMode,
      label: '💰 Modo CFO (Financeiro)',
      desc: 'Foco em MRR, precificação, margem e previsibilidade.',
      color: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/40',
    },
    {
      id: 'comercial' as StrategicMode,
      label: '💼 Diretor Comercial (Vendas)',
      desc: 'Scripts de WhatsApp, prospecção e upsell.',
      color: 'bg-indigo-500/20 text-indigo-400 ring-indigo-500/40',
    },
    {
      id: 'tech_lead' as StrategicMode,
      label: '🛠️ Tech Lead (Projetos)',
      desc: 'Kanban, entregas rápidas e arquitetura web.',
      color: 'bg-cyan-500/20 text-cyan-400 ring-cyan-500/40',
    },
  ];

  // Ações Rápidas por Categoria
  const actionsCatalog = {
    vendas: [
      {
        title: 'Prospecção Fria no WhatsApp',
        desc: 'Script persuasivo usando os cases da Said Clima e Odonto Braga.',
        prompt: `Crie um script completo de prospecção fria para eu enviar no WhatsApp de empresas locais (climatização, advogados, dentistas, clínicas).
Use como prova social os sites que desenvolvi (Said Climatização e Odonto Braga), destacando que são ultra rápidos (Next.js/React), com botões de WhatsApp de alta conversão. Diga exatamente o que falar para conseguir uma resposta positiva.`,
      },
      {
        title: 'Proposta de Manutenção para Cases',
        desc: 'Script para converter Said Clima e Odonto Braga em contratos pagos.',
        prompt: `Analise meus 2 cases de portfólio que hoje não pagam mensalidade:
1. Said Climatização (https://www.saidclima.com.br/)
2. Odonto Braga (https://odonto-braga.vercel.app/)

Crie uma mensagem elegante para eu mandar no WhatsApp dos donos oferecendo um plano de manutenção mensal (R$ 80 a R$ 120/mês) cobrindo hospedagem, pequenas alterações mensais, backup e suporte prioritário.`,
      },
      {
        title: 'Renegociação com XK Eventos',
        desc: 'Estratégia para dobrar o contrato da XK Eventos na renovação.',
        prompt: `Meu cliente XK Eventos paga R$ 70,00/mês em contrato de 1 ano. 
Como posso propor um upgrade no plano (ex: de R$ 70 para R$ 140/mês) agregando serviços de novos banners para eventos, otimização SEO e suporte rápido para vendas de ingressos? Dê o roteiro de conversa.`,
      },
    ],
    financeiro: [
      {
        title: 'Plano 90 Dias para R$ 3.000 MRR',
        desc: 'Cronograma semanal para atingir R$ 3k de receita recorrente mensal.',
        prompt: `Com base no meu MRR atual de ${currency(businessAnalysis.mrr)}/mês e ARR de ${currency(
          businessAnalysis.arr
        )}/ano:
Trace um plano detalhado de 90 dias dividido semana a semana para eu alcançar R$ 3.000,00/mês em contratos recorrentes de manutenção de sites. Quantos clientes preciso fechar por semana e a qual ticket médio?`,
      },
      {
        title: 'Calculadora de Preço de Landing Page',
        desc: 'Quanto cobrar em uma nova página com base no mercado.',
        prompt: `Me ensine a precificar a criação de uma nova Landing Page institucional moderna em Next.js/Tailwind.
Quanto devo cobrar de valor de setup inicial (ex: R$ 800 a R$ 2.000) e quanto embutir de manutenção mensal obrigatória para o cliente nunca cancelar?`,
      },
      {
        title: 'Diagnóstico de Dependência de Receita',
        desc: 'Análise de risco de concentração em clientes únicos.',
        prompt: `Faça uma análise de risco financeiro do meu negócio considerando que grande parte da minha receita recorrente vem de um único contrato da XK Eventos. Quais são os 3 maiores riscos e como blindar meu fluxo de caixa este mês?`,
      },
    ],
    relatorios: [
      {
        title: 'Prestação de Contas Mensal (WhatsApp)',
        desc: 'Relatório profissional de entregas para mandar no fim do mês.',
        prompt: `Gere um modelo de Relatório Mensal de Manutenção formatado para WhatsApp para eu mandar aos meus clientes contratados (como a XK Eventos) no último dia do mês.
O relatório deve comprovar: site 100% no ar, velocidade otimizada, segurança atualizada, alterações realizadas e disponibilidade para o próximo mês.`,
      },
      {
        title: 'Mensagem de Cobrança Elegante',
        desc: 'Lembrete amigável de vencimento e chave PIX.',
        prompt: `Crie 2 modelos de mensagens gentis e profissionais de WhatsApp para enviar no dia do vencimento da mensalidade de manutenção com a chave PIX, sem parecer agressivo ou chato.`,
      },
    ],
    simulador: [
      {
        title: 'E se eu fechar +3 clientes a R$ 150/mês?',
        desc: 'Simulação de faturamento e impacto no ARR anual.',
        prompt: `Simule o seguinte cenário: Se nos próximos 45 dias eu fechar 3 novos clientes de manutenção cobrando R$ 150,00/mês cada:
1. Qual será meu novo MRR?
2. Qual será meu novo faturamento anual (ARR)?
3. Quantas horas por semana isso vai me exigir no Kanban?`,
      },
      {
        title: 'E se eu vender Setup + Recorrência?',
        desc: 'Simulação de modelo híbrido (R$ 1.200 setup + R$ 100/mês).',
        prompt: `Simule o impacto de fechar 2 novas Landing Pages por mês cobrando R$ 1.200,00 de criação + R$ 100,00/mês de manutenção em contrato de 12 meses. Como meu caixa vai estar daqui a 6 meses?`,
      },
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. RADAR EXECUTIVO DO NEGÓCIO (INSIGHTS AUTOMÁTICOS AO VIVO) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Alerta de Concentração de MRR */}
        <Card className="border-amber-500/30 bg-amber-500/5 relative overflow-hidden p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Radar de Receita
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              {businessAnalysis.recurringClientsCount} cliente ativo
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground">
              {currency(businessAnalysis.mrr)} <span className="text-xs font-normal text-muted-foreground">/mês</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Concentração alta na <strong>XK Eventos</strong>. Meta: adicionar +2 clientes para blindar seu caixa.
            </p>
          </div>
          <button
            onClick={() => handleSendMessage('Como posso diversificar minha receita recorrente para não depender de um único cliente?')}
            className="mt-3 text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>Ver plano de ação</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </Card>

        {/* Card 2: Oportunidades em Clientes de Portfólio */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <Lightbulb className="h-3.5 w-3.5" />
              Oportunidades
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              {businessAnalysis.portfolioWithoutRecurring.length} cases livres
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground">
              +R$ 200 a R$ 300 <span className="text-xs font-normal text-muted-foreground">/mês</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              <strong>Said Clima</strong> e <strong>Odonto Braga</strong> podem virar contratos de suporte ativos.
            </p>
          </div>
          <button
            onClick={() => handleSendMessage('Crie uma proposta de manutenção mensal de R$ 90/mês para a Said Climatização e Odonto Braga.')}
            className="mt-3 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Gerar proposta WhatsApp</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </Card>

        {/* Card 3: Eficiência do Kanban */}
        <Card className="border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              <ListTodo className="h-3.5 w-3.5" />
              Fila do Kanban
            </span>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
              {businessAnalysis.pendingTasks.length} pendentes
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground">
              {businessAnalysis.urgentTasks.length} alta prioridade
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Demandas da XK Eventos e Said Clima em fila de produção.
            </p>
          </div>
          <button
            onClick={() => handleSendMessage('Qual a melhor ordem para eu executar as tarefas do meu Kanban hoje?')}
            className="mt-3 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Priorizar com a IA</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </Card>

        {/* Card 4: ARR e Projeção Anual */}
        <Card className="border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Projeção ARR
            </span>
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              12 meses
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground">
              {currency(businessAnalysis.arr)} <span className="text-xs font-normal text-muted-foreground">anual</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Previsão de receita anual contratada garantida no seu Firestore.
            </p>
          </div>
          <button
            onClick={() => handleSendMessage('Como posso elevar meu ARR de R$ 840 para R$ 20.000 no próximo ano?')}
            className="mt-3 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Simular metas de ARR</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </Card>
      </div>

      {/* 2. LENTES ESTRATÉGICAS / MODOS DE CONSULTORIA */}
      <Card className="border-border/60 bg-card/60 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Selecione a Lente Estratégica da IA:
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alterne o chapéu do consultor para obter respostas sob a ótica desejada.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTempKeyInput(customKey);
                setKeyModalOpen(true);
              }}
              className="h-8 text-xs border-border/60 bg-secondary/30 hover:bg-secondary gap-1.5"
            >
              <Key className="h-3.5 w-3.5 text-primary" />
              <span>{customKey ? 'Chave Ativa' : 'Chave API'}</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mt-3 pt-3 border-t border-border/40">
          {personaModes.map((mode) => {
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id);
                  toast.success(`Modo alterado para: ${mode.label}`);
                }}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                    : 'border-border/50 bg-secondary/20 hover:bg-secondary/40'
                }`}
              >
                <span className="text-xs font-bold text-foreground flex items-center justify-between">
                  {mode.label}
                  {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {mode.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. ARSENAL DE AÇÕES RÁPIDAS (ABAS CATEGORIZADAS) */}
      <Card className="border-border/60 bg-card/60 p-4">
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/40">
          {[
            { id: 'vendas', label: '💼 Vendas & WhatsApp', icon: MessageSquare },
            { id: 'financeiro', label: '📈 Financeiro & Escala', icon: DollarSign },
            { id: 'relatorios', label: '📑 Relatórios & Clientes', icon: FileText },
            { id: 'simulador', label: '🔮 Simulador "E se...?"', icon: Calculator },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveActionTab(tab.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeActionTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-3">
          {actionsCatalog[activeActionTab].map((item) => (
            <button
              key={item.title}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={loading}
              className="group flex flex-col justify-between text-left rounded-xl border border-border/60 bg-secondary/20 p-3.5 hover:border-primary/40 hover:bg-secondary/40 transition-all shadow-sm"
            >
              <div>
                <p className="text-xs font-bold text-foreground flex items-center justify-between">
                  {item.title}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {item.desc}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-primary mt-3 inline-flex items-center gap-1">
                Executar análise instantânea ➔
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* 4. CHAT ESTRATÉGICO INTERATIVO */}
      <Card className="border-border/60 bg-card/70 shadow-sm flex flex-col min-h-[500px] max-h-[700px]">
        <CardHeader className="py-3 px-5 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Conversa Estratégica em Tempo Real
            </CardTitle>
            <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {personaModes.find((m) => m.id === activeMode)?.label}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
          </span>
        </CardHeader>

        {/* Messages Scroll Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isCopied = copiedId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm group ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-secondary/50 text-foreground border border-border/60 rounded-tl-none leading-relaxed'
                  }`}
                >
                  {/* Message Header / Timestamp */}
                  <div className="flex items-center justify-between gap-4 mb-1.5 opacity-70 text-[10px]">
                    <span className="font-semibold">
                      {isUser ? 'Você' : 'Antigravity Business Advisor'}
                    </span>
                    <span>{msg.createdAt}</span>
                  </div>

                  {/* Message Content com Renderizador Limpo de Markdown */}
                  <MarkdownFormattedText text={msg.text} />

                  {/* Copy Button for Model responses */}
                  {!isUser && (
                    <div className="mt-3 flex items-center justify-end border-t border-border/30 pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-2"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar Análise</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 text-xs justify-start animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30 animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-border/60 bg-secondary/40 p-4 text-muted-foreground flex items-center gap-2 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Processando dados do seu negócio e gerando resposta com o Gemini...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-border/60 bg-secondary/20 space-y-2">
          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              'Como posso aumentar o ticket da XK Eventos?',
              'Proposta para Said Climatização',
              'Como prospectar novos clientes?',
              'Minha rotina de entregas do Kanban',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                disabled={loading}
                className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua dúvida ou comando estratégico (ex: 'Crie uma mensagem para o cliente Said Clima')..."
              disabled={loading}
              className="bg-card border-border/60 text-xs sm:text-sm h-11"
            />
            <Button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="h-11 px-4 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Enviar</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Modal para Gerenciar Chave de API do Gemini */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Chave de API do Google Gemini
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A chave do Google AI Studio é utilizada para alimentar o consultor de negócios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="gemini-key">Sua API Key do Gemini</Label>
              <Input
                id="gemini-key"
                type="password"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                placeholder="AQ.Ab8RN6Kwv0wnC..."
                className="bg-secondary/40 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Se deixar em branco, o sistema utilizará a chave padrão configurada no servidor.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setKeyModalOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCustomKey}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            >
              Salvar Chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
