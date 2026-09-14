'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { LoginView } from '@/components/auth/login-view';
import { Sidebar, ActivePage } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { MetricsCards } from '@/components/dashboard/metrics-cards';
import { EntriesTable } from '@/components/dashboard/entries-table';
import { EntryDialog } from '@/components/dashboard/entry-dialog';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { ClientsView } from '@/components/dashboard/clients-view';
import { SnippetsView } from '@/components/dashboard/snippets-view';
import { TasksKanbanView } from '@/components/dashboard/tasks-kanban-view';
import { AIAdvisorView } from '@/components/dashboard/ai-advisor-view';
import { mockEntries, initialPortfolioProjects, initialSnippets, initialTasks } from '@/lib/mock-data';
import {
  Entry,
  NewEntryInput,
  ClientProject,
  NewClientProjectInput,
  SnippetResource,
  NewSnippetInput,
  TaskDemand,
  NewTaskInput,
  TaskStatus,
  parseLocalDate,
} from '@/lib/types';
import {
  subscribeToEntries,
  addEntryToFirestore,
  updateEntryInFirestore,
  deleteEntryFromFirestore,
  seedMockDataToFirestore,
  renameClientInFirestore,
  deleteClientFromFirestore,
} from '@/lib/firestore-entries';
import {
  subscribeToClientProjects,
  saveClientProjectToFirestore,
  deleteClientProjectDoc,
} from '@/lib/firestore-clients';
import {
  subscribeToSnippets,
  saveSnippetToFirestore,
  deleteSnippetFromFirestore,
} from '@/lib/firestore-snippets';
import {
  subscribeToTasks,
  saveTaskToFirestore,
  updateTaskStatusInFirestore,
  deleteTaskFromFirestore,
} from '@/lib/firestore-tasks';
import { toast } from 'sonner';
import { Loader2, Sparkles, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user: realUser, loading: authLoading } = useAuth();
  
  // MOCK USER: Bypass login for testing
  const user = realUser || { uid: 'mock-user-123', displayName: 'Test User' };

  const [page, setPage] = useState<ActivePage>('painel');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProject[]>([]);
  const [snippets, setSnippets] = useState<SnippetResource[]>([]);
  const [tasks, setTasks] = useState<TaskDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [duplicateTemplate, setDuplicateTemplate] = useState<Entry | null>(null);
  const [defaultClientName, setDefaultClientName] = useState<string>('');

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setClientProfiles([]);
      setSnippets([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Escuta Lançamentos Financeiros
    const unsubEntries = subscribeToEntries(
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (error) => {
        console.error('Erro Firestore Lançamentos:', error);
        setEntries([]);
        setLoading(false);
      },
      user.uid
    );

    // 2. Escuta Fichas de Clientes / Projetos
    const unsubClients = subscribeToClientProjects(
      (data) => {
        setClientProfiles(data);
      },
      (error) => {
        console.error('Erro Firestore Clientes:', error);
      },
      user.uid
    );

    // 3. Escuta Biblioteca de Prompts & Componentes
    const unsubSnippets = subscribeToSnippets(
      (data) => {
        setSnippets(data);
      },
      (error) => {
        console.error('Erro Firestore Snippets:', error);
      },
      user.uid
    );

    // 4. Escuta Quadro Kanban de Tarefas
    const unsubTasks = subscribeToTasks(
      (data) => {
        setTasks(data);
      },
      (error) => {
        console.error('Erro Firestore Tarefas:', error);
      },
      user.uid
    );

    return () => {
      if (unsubEntries) unsubEntries();
      if (unsubClients) unsubClients();
      if (unsubSnippets) unsubSnippets();
      if (unsubTasks) unsubTasks();
    };
  }, [user]);

  // Lista de nomes de clientes distintos para autocompletar
  const clientSuggestions = useMemo(() => {
    const fromEntries = entries.map((e) => e.client.trim());
    const fromProfiles = clientProfiles.map((p) => p.name.trim());
    return Array.from(new Set([...fromEntries, ...fromProfiles].filter(Boolean)));
  }, [entries, clientProfiles]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.client.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const handleNew = () => {
    setEditing(null);
    setDuplicateTemplate(null);
    setDefaultClientName('');
    setDialogOpen(true);
  };

  const handleNewEntryForClient = (clientName: string) => {
    setEditing(null);
    setDuplicateTemplate(null);
    setDefaultClientName(clientName);
    setDialogOpen(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditing(entry);
    setDuplicateTemplate(null);
    setDialogOpen(true);
  };

  const handleDuplicate = (entry: Entry) => {
    setEditing(null);
    setDuplicateTemplate(entry);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteEntryFromFirestore(id, user.uid);
      toast.success('Entrada excluída com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir a entrada no Firebase.');
    }
  };

  const handleSave = async (input: NewEntryInput, id?: string) => {
    if (!user) return;
    try {
      if (id) {
        // Edição de lançamento individual
        await updateEntryInFirestore(id, input, user.uid);
        toast.success('Lançamento atualizado no Firestore!');
      } else {
        // Criação: se for recorrente e tiver duração em meses > 1
        const months = input.contractMonths && input.contractMonths > 1 && input.type === 'recorrente'
          ? input.contractMonths
          : 1;

        if (months > 1) {
          const { year, month, day } = parseLocalDate(input.date);
          const now = new Date();
          const currentYearMonth = now.getFullYear() * 12 + now.getMonth();

          for (let i = 0; i < months; i++) {
            const targetDate = new Date(year, month + i, day);
            const targetY = targetDate.getFullYear();
            const targetM = String(targetDate.getMonth() + 1).padStart(2, '0');
            const targetD = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${targetY}-${targetM}-${targetD}`;

            const itemYearMonth = targetY * 12 + targetDate.getMonth();
            const isPast = itemYearMonth < currentYearMonth;
            const isCurrent = itemYearMonth === currentYearMonth;
            const status = isPast || (isCurrent && input.status === 'recebido')
              ? 'recebido'
              : 'a_receber';

            await addEntryToFirestore(
              {
                description: `${input.description} (${i + 1}/${months})`,
                client: input.client,
                value: input.value,
                type: 'recorrente',
                status,
                date: dateStr,
                contractMonths: months,
              },
              user.uid
            );
          }

          toast.success(
            `Contrato de ${months} meses criado! ${months} mensalidades foram vinculadas ao cliente ${input.client}. 🎉`
          );
        } else {
          // Lançamento avulso ou de 1 mês
          await addEntryToFirestore(input, user.uid);
          toast.success('Novo lançamento salvo no Firestore!');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar no Firestore. Verifique a conexão.');
    }
  };

  const handleToggleStatus = async (entry: Entry) => {
    if (!user) return;
    const newStatus = entry.status === 'recebido' ? 'a_receber' : 'recebido';
    try {
      await updateEntryInFirestore(entry.id, { status: newStatus }, user.uid);
      toast.success(
        newStatus === 'recebido'
          ? 'Status alterado para Recebido! 🎉'
          : 'Status alterado para A Receber.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status.');
    }
  };

  const handleRenameClient = async (oldName: string, newName: string) => {
    if (!user) return;
    try {
      const updatedCount = await renameClientInFirestore(oldName, newName, user.uid);
      if (updatedCount > 0) {
        toast.success(
          `Cliente renomeado para "${newName}" em ${updatedCount} lançamentos!`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao renomear cliente no Firebase.');
    }
  };

  const handleSaveClientProfile = async (profile: NewClientProjectInput, id?: string) => {
    if (!user) return;
    await saveClientProjectToFirestore(profile, id, user.uid);
  };

  const handleDeleteClientProfile = async (id: string, clientName: string) => {
    if (!user) return;
    if (id) {
      await deleteClientProjectDoc(id, user.uid);
    }
    if (clientName) {
      await deleteClientFromFirestore(clientName, user.uid);
    }
    toast.success(`"${clientName}" excluído com sucesso.`);
  };

  const handleSaveSnippet = async (snippet: NewSnippetInput, id?: string) => {
    if (!user) return;
    await saveSnippetToFirestore(snippet, id, user.uid);
  };

  const handleDeleteSnippet = async (id: string) => {
    if (!user) return;
    await deleteSnippetFromFirestore(id, user.uid);
  };

  const handleSaveTask = async (task: NewTaskInput, id?: string) => {
    if (!user) return;
    await saveTaskToFirestore(task, id, user.uid);
  };

  const handleUpdateTaskStatus = async (id: string, status: TaskStatus) => {
    if (!user) return;
    await updateTaskStatusInFirestore(id, status, user.uid);
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    await deleteTaskFromFirestore(id, user.uid);
  };

  const handleSeedData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedMockDataToFirestore(mockEntries, user.uid);
      toast.success('Dados de exemplo carregados no seu Firestore!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de exemplo.');
    } finally {
      setIsSeeding(false);
    }
  };

  const titles: Record<ActivePage, { title: string; subtitle: string }> = {
    painel: {
      title: 'Painel Geral & Inteligência',
      subtitle: 'Gráficos de evolução, total recebido e previsibilidade financeira.',
    },
    entradas: {
      title: 'Entradas & Caixa',
      subtitle:
        'Acompanhe e filtre todos os valores que entram e contratos do seu negócio.',
    },
    clientes: {
      title: 'Clientes & Projetos',
      subtitle: 'Centralize clientes comerciais, sites de portfólio, projetos pessoais, links de repositório e contratos.',
    },
    tarefas: {
      title: 'Tarefas & Demandas dos Clientes',
      subtitle: 'Quadro Kanban para organizar solicitações de manutenção, alterações de sites e prazos.',
    },
    ia: {
      title: 'IA Estratégica & Negócios',
      subtitle: 'Google Gemini conectado aos seus clientes, contratos, MRR e tarefas para acelerar seus resultados.',
    },
    biblioteca: {
      title: 'Biblioteca & Prompts',
      subtitle: 'Seu arsenal de prompts de IA, componentes React/Tailwind e blocos de código prontos.',
    },
    metas: {
      title: 'Metas',
      subtitle: 'Defina e acompanhe suas metas de receita recorrente.',
    },
  };

  const { title, subtitle } = titles[page];

  // Splash Screen enquanto verifica a autenticação do Firebase
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 animate-pulse">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Iniciando CashFlow...</span>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={page} onNavigate={setPage} />

      <div className="lg:pl-64">
        <Header search={search} onSearch={setSearch} onNewEntry={handleNew} />

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              {entries.length === 0 && !loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="gap-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Carregar Dados de Exemplo
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Sincronizando com Firestore...</p>
            </div>
          ) : (
            <>
              {/* ABA: PAINEL GERAL (GRÁFICOS & ANALYTICS) */}
              {page === 'painel' && (
                <DashboardOverview
                  entries={entries}
                  onNavigate={setPage}
                  onNewEntry={handleNew}
                />
              )}

              {/* ABA: ENTRADAS & CAIXA (TABELA & FILTROS) */}
              {page === 'entradas' && (
                <div className="space-y-6 animate-fade-in">
                  <MetricsCards entries={entries} />
                  <EntriesTable
                    entries={filteredEntries}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    onDuplicate={handleDuplicate}
                  />
                </div>
              )}

              {/* ABA: CLIENTES & PROJETOS */}
              {page === 'clientes' && (
                <ClientsView
                  entries={entries}
                  clientProfiles={clientProfiles}
                  onNewEntryForClient={handleNewEntryForClient}
                  onToggleStatus={handleToggleStatus}
                  onSaveProfile={handleSaveClientProfile}
                  onDeleteProfile={handleDeleteClientProfile}
                  onRenameClient={handleRenameClient}
                />
              )}

              {/* ABA: TAREFAS & DEMANDAS (KANBAN) */}
              {page === 'tarefas' && (
                <TasksKanbanView
                  tasks={tasks}
                  clientSuggestions={clientSuggestions}
                  onSaveTask={handleSaveTask}
                  onUpdateStatus={handleUpdateTaskStatus}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {/* ABA: IA ESTRATÉGICA (GOOGLE GEMINI) */}
              {page === 'ia' && (
                <AIAdvisorView
                  entries={entries}
                  clients={clientProfiles}
                  tasks={tasks}
                  snippets={snippets}
                  onSaveEntry={handleSave}
                />
              )}

              {/* ABA: BIBLIOTECA & PROMPTS */}
              {page === 'biblioteca' && (
                <SnippetsView
                  snippets={snippets}
                  onSaveSnippet={handleSaveSnippet}
                  onDeleteSnippet={handleDeleteSnippet}
                />
              )}

              {/* ABA: METAS */}
              {page === 'metas' && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-24 text-center">
                  <p className="text-sm text-muted-foreground">
                    Esta seção estará disponível em breve.
                  </p>
                  <button
                    onClick={() => setPage('painel')}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Voltar para o Painel Geral
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        duplicateTemplate={duplicateTemplate}
        defaultClient={defaultClientName}
        clientSuggestions={clientSuggestions}
        onSave={handleSave}
      />
    </div>
  );
}
