'use client';

import { useState, useMemo } from 'react';
import { Entry, ClientProject, ClientCategory, NewClientProjectInput, currency, formatDate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Zap,
  Wallet,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Pencil,
  Trash2,
  Globe,
  Github,
  Phone,
  FileText,
  Code2,
  ExternalLink,
  Sparkles,
  Loader2,
  Briefcase,
  Layers,
  FolderGit2,
  Rocket,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientsViewProps {
  entries: Entry[];
  clientProfiles: ClientProject[];
  onNewEntryForClient: (clientName: string) => void;
  onToggleStatus: (entry: Entry) => void;
  onSaveProfile: (profile: NewClientProjectInput, id?: string) => Promise<void>;
  onDeleteProfile: (id: string, clientName: string) => Promise<void>;
  onRenameClient: (oldName: string, newName: string) => Promise<void>;
}

interface MergedClientProject {
  id?: string;
  name: string;
  category: ClientCategory;
  phone?: string;
  email?: string;
  siteUrl?: string;
  githubUrl?: string;
  contractPdfUrl?: string;
  notes?: string;
  techStack: string[];
  totalReceived: number;
  totalPending: number;
  totalContract: number;
  monthlyRecurring: number;
  isRecurring: boolean;
  entriesCount: number;
  firstDate?: string;
  entries: Entry[];
}

const emptyForm: NewClientProjectInput = {
  name: '',
  category: 'comercial',
  phone: '',
  email: '',
  siteUrl: '',
  githubUrl: '',
  contractPdfUrl: '',
  notes: '',
  techStack: [],
};

export function ClientsView({
  entries,
  clientProfiles,
  onNewEntryForClient,
  onToggleStatus,
  onSaveProfile,
  onDeleteProfile,
  onRenameClient,
}: ClientsViewProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | ClientCategory>('all');
  const [selectedClient, setSelectedClient] = useState<MergedClientProject | null>(null);
  
  // Dialog de Criação / Edição de Ficha
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [originalName, setOriginalName] = useState('');
  const [form, setForm] = useState<NewClientProjectInput>(emptyForm);
  const [techInput, setTechInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Assist
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiFill = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const customKey = localStorage.getItem('cf_custom_gemini_key') || undefined;
      const prompt = `O usuário quer ${editingId ? 'editar' : 'adicionar'} uma ficha de cliente/projeto.
Texto do usuário: "${aiInput}".
${editingId ? `\nDados atuais (atualize o que o usuário pedir e mantenha o resto intacto): ${JSON.stringify(form)} (Techs atuais: ${techInput})` : ''}

Retorne APENAS a tag [ADD_CLIENT:{...}] no final da resposta com os dados estruturados. Formato esperado na tag:
{"name": "Nome", "category": "comercial" | "portfolio" | "pessoal", "siteUrl": "url", "githubUrl": "url", "phone": "tel", "email": "email", "contractPdfUrl": "url", "notes": "notas", "techStack": ["Tech1", "Tech2"]}
Não adicione markdown fora da tag.`;

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
      
      const match = data.reply.match(/\[ADD_CLIENT:(.+?)\]/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        setForm((prev) => ({ ...prev, ...parsed }));
        if (parsed.techStack && Array.isArray(parsed.techStack)) {
          setTechInput(parsed.techStack.join(', '));
        }
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

  // Dialog de Exclusão
  const [deletingClient, setDeletingClient] = useState<MergedClientProject | null>(null);

  // Mescla perfis cadastrados + clientes detectados nos lançamentos
  const mergedClients = useMemo(() => {
    const map = new Map<string, MergedClientProject>();

    // 1. Inicia com os perfis salvos no Firestore
    clientProfiles.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      map.set(key, {
        id: p.id,
        name: p.name,
        category: p.category || 'comercial',
        phone: p.phone || '',
        email: p.email || '',
        siteUrl: p.siteUrl || '',
        githubUrl: p.githubUrl || '',
        contractPdfUrl: p.contractPdfUrl || '',
        notes: p.notes || '',
        techStack: p.techStack || [],
        totalReceived: 0,
        totalPending: 0,
        totalContract: 0,
        monthlyRecurring: 0,
        isRecurring: false,
        entriesCount: 0,
        entries: [],
      });
    });

    // 2. Mescla lançamentos financeiros
    entries.forEach((e) => {
      const clientName = e.client.trim() || 'Cliente Sem Nome';
      const key = clientName.toLowerCase();

      const existing = map.get(key) || {
        name: clientName,
        category: 'comercial',
        phone: '',
        email: '',
        siteUrl: '',
        githubUrl: '',
        contractPdfUrl: '',
        notes: '',
        techStack: [],
        totalReceived: 0,
        totalPending: 0,
        totalContract: 0,
        monthlyRecurring: 0,
        isRecurring: false,
        entriesCount: 0,
        firstDate: e.date,
        entries: [],
      };

      existing.entries.push(e);
      existing.entriesCount += 1;
      existing.totalContract += e.value;

      if (e.status === 'recebido') {
        existing.totalReceived += e.value;
      } else {
        existing.totalPending += e.value;
      }

      if (e.type === 'recorrente') {
        existing.isRecurring = true;
        existing.monthlyRecurring = Math.max(existing.monthlyRecurring, e.value);
      }

      if (!existing.firstDate || e.date < existing.firstDate) {
        existing.firstDate = e.date;
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      // Comerciais com faturamento primeiro, depois alfabético
      if (b.totalContract !== a.totalContract) return b.totalContract - a.totalContract;
      return a.name.localeCompare(b.name);
    });
  }, [entries, clientProfiles]);

  // Filtragem
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mergedClients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        c.techStack.some((t) => t.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterCategory === 'all') return true;
      return c.category === filterCategory;
    });
  }, [mergedClients, search, filterCategory]);

  // KPIs
  const stats = useMemo(() => {
    const total = mergedClients.length;
    const comerciais = mergedClients.filter((c) => c.category === 'comercial').length;
    const portfolio = mergedClients.filter((c) => c.category === 'portfolio').length;
    const pessoais = mergedClients.filter((c) => c.category === 'pessoal').length;
    const totalMRR = mergedClients.reduce((acc, c) => acc + c.monthlyRecurring, 0);

    return { total, comerciais, portfolio, pessoais, totalMRR };
  }, [mergedClients]);

  // Abrir Modal de Criação de Projeto / Cliente
  const handleOpenNew = () => {
    setEditingId(undefined);
    setOriginalName('');
    setForm(emptyForm);
    setTechInput('');
    setDialogOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (client: MergedClientProject) => {
    setEditingId(client.id);
    setOriginalName(client.name);
    setForm({
      name: client.name,
      category: client.category || 'comercial',
      phone: client.phone || '',
      email: client.email || '',
      siteUrl: client.siteUrl || '',
      githubUrl: client.githubUrl || '',
      contractPdfUrl: client.contractPdfUrl || '',
      notes: client.notes || '',
      techStack: client.techStack || [],
    });
    setTechInput((client.techStack || []).join(', '));
    setDialogOpen(true);
  };

  // Salvar Ficha do Projeto / Cliente
  const handleSaveForm = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do cliente ou projeto.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Processa techStack a partir do texto separado por vírgulas
      const stackList = techInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const finalInput: NewClientProjectInput = {
        ...form,
        name: form.name.trim(),
        techStack: stackList,
      };

      // Se o nome foi alterado e havia um nome original, renomeia nos lançamentos
      if (originalName && originalName.trim() !== finalInput.name) {
        await onRenameClient(originalName, finalInput.name);
      }

      await onSaveProfile(finalInput, editingId);
      toast.success('Ficha do cliente/projeto salva com sucesso! 🎉');
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar ficha do cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsSubmitting(true);
    try {
      await onDeleteProfile(deletingClient.id || '', deletingClient.name);
      setDeletingClient(null);
      if (selectedClient?.name === deletingClient.name) {
        setSelectedClient(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper de WhatsApp Link
  const formatWhatsappLink = (phoneStr?: string) => {
    if (!phoneStr) return null;
    const clean = phoneStr.replace(/\D/g, '');
    if (!clean) return null;
    const num = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${num}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Client & Project KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Projetos & Clientes
            </CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.comerciais} comerciais · {stats.portfolio} portfólio · {stats.pessoais} pessoais
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clientes Comerciais
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.comerciais}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currency(stats.totalMRR)} /mês em MRR ativo
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portfólio & Gratuitos
            </CardTitle>
            <FolderGit2 className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">{stats.portfolio}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              cases e sites criados para vitrine
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Projetos Pessoais
            </CardTitle>
            <Rocket className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{stats.pessoais}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              SaaS, ferramentas e estudos próprios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar & Categorias */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, tech stack ou anotações..."
            className="pl-9 bg-secondary/40 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'comercial', label: '🟢 Comerciais' },
            { id: 'portfolio', label: '🟣 Portfólio' },
            { id: 'pessoal', label: '🚀 Pessoais' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterCategory === tab.id
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/40 font-bold'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <Button
            size="sm"
            onClick={handleOpenNew}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Cliente / Projeto</span>
          </Button>
        </div>
      </div>

      {/* Grid de Cards dos Clientes e Projetos */}
      {filteredClients.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">Nenhum projeto ou cliente encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Cadastre seus clientes comerciais, sites gratuitos do seu repositório ou projetos pessoais para centralizar todo o seu trabalho aqui.
          </p>
          <Button
            size="sm"
            onClick={handleOpenNew}
            className="mt-4 gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Primeiro Projeto / Cliente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const initials = client.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase() || 'CP';

            const waLink = formatWhatsappLink(client.phone);

            return (
              <Card
                key={client.name}
                className="border-border/60 bg-card/60 transition-all hover:border-primary/40 shadow-sm flex flex-col justify-between group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ring-1 ${
                          client.category === 'comercial'
                            ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
                            : client.category === 'portfolio'
                            ? 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/30'
                            : 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <CardTitle className="truncate text-base font-semibold text-foreground">
                          {client.name}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-0.5 truncate">
                          {client.category === 'comercial' && (
                            <span className="text-emerald-400 font-medium">Cliente Comercial</span>
                          )}
                          {client.category === 'portfolio' && (
                            <span className="text-indigo-400 font-medium">Portfólio / Case Grátis</span>
                          )}
                          {client.category === 'pessoal' && (
                            <span className="text-cyan-400 font-medium">Projeto Pessoal / Estudo</span>
                          )}
                          {client.firstDate && ` · Desde ${formatDate(client.firstDate)}`}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(client)}
                        title="Editar ficha completa"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingClient(client)}
                        title="Excluir"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Badges de Links Rápidos (Live Site, GitHub, WhatsApp, Contrato) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-3">
                    {client.siteUrl && (
                      <a
                        href={client.siteUrl.startsWith('http') ? client.siteUrl : `https://${client.siteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/60 hover:bg-primary/20 hover:text-primary px-2 py-1 text-[11px] font-medium text-foreground transition-colors"
                      >
                        <Globe className="h-3 w-3 text-primary" />
                        <span>Site no Ar</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    )}

                    {client.githubUrl && (
                      <a
                        href={client.githubUrl.startsWith('http') ? client.githubUrl : `https://${client.githubUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/60 hover:bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="h-3 w-3" />
                        <span>Repositório</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    )}

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 text-[11px] font-medium transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {client.contractPdfUrl && (
                      <a
                        href={client.contractPdfUrl.startsWith('http') ? client.contractPdfUrl : `https://${client.contractPdfUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/60 hover:bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FileText className="h-3 w-3 text-amber-400" />
                        <span>Contrato PDF</span>
                      </a>
                    )}
                  </div>

                  {/* Tech Stack Tags */}
                  {client.techStack.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-2">
                      {client.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-border/50 bg-secondary/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Detalhes Financeiros ou Descrição */}
                  {client.category === 'comercial' ? (
                    <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 space-y-2 text-xs">
                      {client.isRecurring && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Mensalidade:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {currency(client.monthlyRecurring)} /mês
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Já Pago:</span>
                        <span className="font-bold text-foreground font-mono">
                          {currency(client.totalReceived)}
                        </span>
                      </div>
                      {client.totalPending > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">A Receber:</span>
                          <span className="font-semibold text-amber-400 font-mono">
                            {currency(client.totalPending)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs text-muted-foreground line-clamp-3">
                      {client.notes ? (
                        <p className="italic">"{client.notes}"</p>
                      ) : (
                        <p className="opacity-70">
                          {client.category === 'portfolio'
                            ? 'Projeto voluntário / portfólio para vitrine profissional.'
                            : 'Projeto e estudo pessoal.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClient(client)}
                      className="flex-1 text-xs gap-1.5 border-border/60 bg-secondary/30 hover:bg-secondary"
                    >
                      <span>Ver Ficha & Extrato</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>

                    {client.category === 'comercial' && (
                      <Button
                        size="sm"
                        onClick={() => onNewEntryForClient(client.name)}
                        className="text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Nova Entrada</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição da Ficha Completa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Ficha do Cliente / Projeto' : 'Novo Cliente ou Projeto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Guarde todos os detalhes técnicos, links de repositório, WhatsApp e contratos em um só lugar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-sm">
            {/* Assistente IA */}
            <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 mb-2">
              <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                Preenchimento Mágico com IA
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder={editingId ? "Ex: Mude a stack para Next.js e Tailwind..." : "Ex: Cliente Barbearia Navalha, site navalha.com.br, tel 11999..."}
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

            {/* Nome e Categoria */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="client-name">Nome do Cliente / Projeto *</Label>
                <Input
                  id="client-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Barbearia Navalha ou MeuSaaS"
                  className="bg-secondary/40"
                  autoFocus
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="client-category">Tipo de Projeto</Label>
                <select
                  id="client-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ClientCategory })}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="comercial">🟢 Cliente Comercial (Pago)</option>
                  <option value="portfolio">🟣 Portfólio / Site Gratuito</option>
                  <option value="pessoal">🚀 Projeto Pessoal / Estudo</option>
                </select>
              </div>
            </div>

            {/* Links Rápidos: Site e Repositório */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="client-site" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Link do Site no Ar (URL)
                </Label>
                <Input
                  id="client-site"
                  value={form.siteUrl}
                  onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
                  placeholder="https://meusite.com.br"
                  className="bg-secondary/40 font-mono text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="client-github" className="flex items-center gap-1.5">
                  <Github className="h-3.5 w-3.5" />
                  Link do Repositório GitHub
                </Label>
                <Input
                  id="client-github"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  placeholder="https://github.com/usuario/repo"
                  className="bg-secondary/40 font-mono text-xs"
                />
              </div>
            </div>

            {/* Contato: WhatsApp e E-mail */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="client-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  WhatsApp / Telefone
                </Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (11) 98765-4321"
                  className="bg-secondary/40"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="client-email">E-mail de Contato</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@empresa.com"
                  className="bg-secondary/40"
                />
              </div>
            </div>

            {/* Link do Contrato PDF */}
            <div className="grid gap-1.5">
              <Label htmlFor="client-pdf" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Link do Contrato em PDF (Google Drive, Firebase, etc.)
              </Label>
              <Input
                id="client-pdf"
                value={form.contractPdfUrl}
                onChange={(e) => setForm({ ...form, contractPdfUrl: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Stack Tecnológica */}
            <div className="grid gap-1.5">
              <Label htmlFor="client-tech" className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-primary" />
                Tecnologias Utilizadas (separadas por vírgula)
              </Label>
              <Input
                id="client-tech"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                placeholder="Ex: React, Next.js, Tailwind CSS, Firebase, TypeScript"
                className="bg-secondary/40"
              />
            </div>

            {/* Anotações e Detalhes */}
            <div className="grid gap-1.5">
              <Label htmlFor="client-notes">Anotações & Regras do Contrato / Projeto</Label>
              <Textarea
                id="client-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: Hospedagem na Vercel, domínio na Hostinger, contrato prevê até 2 atualizações mensais de conteúdo..."
                className="bg-secondary/40 resize-none text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveForm}
              disabled={isSubmitting || !form.name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Cadastrar Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deletingClient?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ficha?
              {deletingClient && deletingClient.entriesCount > 0 && (
                <span className="block mt-2 font-medium text-amber-400">
                  ⚠️ Este cliente possui {deletingClient.entriesCount} lançamentos financeiros cadastrados que também serão removidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Extrato e Ficha Completa */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
                      {selectedClient.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-lg">{selectedClient.name}</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Ficha operacional e histórico financeiro consolidado
                      </DialogDescription>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const c = selectedClient;
                      setSelectedClient(null);
                      handleOpenEdit(c);
                    }}
                    className="text-xs gap-1.5 border-border/60"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar Ficha
                  </Button>
                </div>
              </DialogHeader>

              {/* Links e Contatos */}
              <div className="grid sm:grid-cols-2 gap-3 my-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    Links do Projeto:
                  </p>
                  {selectedClient.siteUrl ? (
                    <a
                      href={selectedClient.siteUrl.startsWith('http') ? selectedClient.siteUrl : `https://${selectedClient.siteUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-mono truncate"
                    >
                      {selectedClient.siteUrl}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">Nenhum site cadastrado</p>
                  )}

                  {selectedClient.githubUrl ? (
                    <a
                      href={selectedClient.githubUrl.startsWith('http') ? selectedClient.githubUrl : `https://${selectedClient.githubUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground hover:underline flex items-center gap-1 font-mono truncate"
                    >
                      <Github className="h-3 w-3 shrink-0" />
                      {selectedClient.githubUrl}
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">Nenhum repositório GitHub</p>
                  )}

                  {selectedClient.contractPdfUrl && (
                    <a
                      href={selectedClient.contractPdfUrl.startsWith('http') ? selectedClient.contractPdfUrl : `https://${selectedClient.contractPdfUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1 font-mono truncate"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      Visualizar Contrato PDF
                    </a>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    Contato & WhatsApp:
                  </p>
                  {selectedClient.phone ? (
                    <p className="text-foreground flex items-center justify-between">
                      <span>{selectedClient.phone}</span>
                      {formatWhatsappLink(selectedClient.phone) && (
                        <a
                          href={formatWhatsappLink(selectedClient.phone)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-emerald-400 hover:underline"
                        >
                          Abrir WhatsApp →
                        </a>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">Telefone não informado</p>
                  )}

                  {selectedClient.email ? (
                    <p className="text-muted-foreground truncate">{selectedClient.email}</p>
                  ) : (
                    <p className="text-muted-foreground italic">E-mail não informado</p>
                  )}
                </div>
              </div>

              {/* Tech Stack e Notas */}
              {selectedClient.techStack.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Tecnologias Utilizadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClient.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedClient.notes && (
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">Anotações do Projeto:</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              )}

              {/* Seção Financeira (se houver lançamentos) */}
              {selectedClient.entries.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Histórico Financeiro ({selectedClient.entries.length} parcelas)
                    </p>
                    <span className="text-xs text-emerald-400 font-bold">
                      Total: {currency(selectedClient.totalContract)}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {selectedClient.entries
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-2.5 text-xs transition-colors hover:bg-secondary/40"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                e.type === 'recorrente'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-indigo-500/15 text-indigo-400'
                              }`}
                            >
                              {e.type === 'recorrente' ? (
                                <RefreshCw className="h-3.5 w-3.5" />
                              ) : (
                                <Zap className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{e.description}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDate(e.date)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-foreground font-mono">
                              {currency(e.value)}
                            </span>

                            <button
                              onClick={() => onToggleStatus(e)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-transform hover:scale-105 ${
                                e.status === 'recebido'
                                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                              }`}
                            >
                              {e.status === 'recebido' ? 'Recebido' : 'A Receber'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
