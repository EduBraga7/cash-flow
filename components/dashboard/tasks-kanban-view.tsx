'use client';

import { useState, useMemo } from 'react';
import { TaskDemand, TaskStatus, TaskPriority, TaskType, NewTaskInput, formatDate, parseLocalDate } from '@/lib/types';
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
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  Rocket,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Calendar,
  Layers,
  Wrench,
  Bug,
  Sparkles,
  Timer,
  CheckSquare2,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';

interface TasksKanbanViewProps {
  tasks: TaskDemand[];
  clientSuggestions: string[];
  onSaveTask: (task: NewTaskInput, id?: string) => Promise<void>;
  onUpdateStatus: (id: string, status: TaskStatus) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const emptyForm: NewTaskInput = {
  title: '',
  client: '',
  scope: 'cliente',
  status: 'todo',
  priority: 'media',
  type: 'manutencao',
  dueDate: '',
  description: '',
  hoursEstimate: 1,
};

const personalProjectSuggestions = [
  'PromptVault',
  'CashFlow',
  'Meu Portfólio Pessoal',
  'Estudos / IA & Tech',
  'Projeto Pessoal / SaaS',
];

export function TasksKanbanView({
  tasks,
  clientSuggestions,
  onSaveTask,
  onUpdateStatus,
  onDeleteTask,
}: TasksKanbanViewProps) {
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'cliente' | 'pessoal'>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<NewTaskInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTask, setDeletingTask] = useState<TaskDemand | null>(null);

  // Lista de clientes únicos para filtro
  const distinctClients = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.client && t.client.trim()) set.add(t.client.trim());
    });
    clientSuggestions.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [tasks, clientSuggestions]);

  // Filtragem
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.client.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filtro por Escopo (Clientes vs Projetos Pessoais)
      const isPersonal =
        t.scope === 'pessoal' ||
        t.type === 'projeto_pessoal' ||
        t.type === 'estudo' ||
        personalProjectSuggestions.some((p) => p.toLowerCase() === t.client.toLowerCase());

      if (filterScope === 'cliente' && isPersonal) return false;
      if (filterScope === 'pessoal' && !isPersonal) return false;

      if (filterClient !== 'all' && t.client.toLowerCase() !== filterClient.toLowerCase()) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      return true;
    });
  }, [tasks, search, filterScope, filterClient, filterPriority, filterType]);

  // Colunas do Kanban
  const todoTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'todo'), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'in_progress'), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'done'), [filteredTasks]);

  // KPIs
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status !== 'done').length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const totalHours = tasks.reduce((acc, t) => acc + (t.hoursEstimate || 0), 0);
    return { total, pending, completed, totalHours };
  }, [tasks]);

  const handleOpenNew = (defaultScope: 'cliente' | 'pessoal' = 'cliente', defaultName?: string) => {
    setEditingId(undefined);
    setForm({
      ...emptyForm,
      scope: defaultScope,
      type: defaultScope === 'pessoal' ? 'projeto_pessoal' : 'manutencao',
      client: defaultName || (defaultScope === 'pessoal' ? 'PromptVault' : (distinctClients[0] || '')),
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (task: TaskDemand) => {
    setEditingId(task.id);
    const isPersonal =
      task.scope === 'pessoal' ||
      task.type === 'projeto_pessoal' ||
      task.type === 'estudo';

    setForm({
      title: task.title,
      client: task.client,
      scope: isPersonal ? 'pessoal' : 'cliente',
      status: task.status,
      priority: task.priority,
      type: task.type,
      dueDate: task.dueDate || '',
      description: task.description || '',
      hoursEstimate: task.hoursEstimate || 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.client.trim()) {
      toast.error('Informe o título e o nome do cliente ou projeto.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTask(
        {
          ...form,
          title: form.title.trim(),
          client: form.client.trim(),
          hoursEstimate: Number(form.hoursEstimate) || 0,
        },
        editingId
      );
      toast.success(
        form.scope === 'pessoal'
          ? 'Demanda do Projeto Pessoal salva! 🚀'
          : 'Demanda do Cliente salva! 🎯'
      );
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar tarefa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    try {
      await onUpdateStatus(id, newStatus);
      if (newStatus === 'done') {
        toast.success('Tarefa concluída! Parabéns! 🎉');
      } else if (newStatus === 'in_progress') {
        toast.info('Tarefa movida para Em Andamento ⏳');
      } else {
        toast.info('Tarefa reaberta 📌');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao mover status da tarefa.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const targetId = deletingTask.id;
    setDeletingTask(null);
    setIsSubmitting(true);
    try {
      await onDeleteTask(targetId);
      toast.success('Tarefa excluída com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir tarefa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper de badges de prioridade
  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgente':
        return { label: 'Urgente', color: 'bg-red-500/15 text-red-400 ring-red-500/30' };
      case 'alta':
        return { label: 'Alta', color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' };
      case 'media':
        return { label: 'Média', color: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30' };
      case 'baixa':
        return { label: 'Baixa', color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' };
    }
  };

  // Helper de badges de tipo
  const getTypeBadge = (t: TaskType) => {
    switch (t) {
      case 'projeto_pessoal':
        return { label: 'Projeto Pessoal / SaaS', icon: Rocket, color: 'text-purple-400' };
      case 'estudo':
        return { label: 'Estudo / Tech', icon: BookOpen, color: 'text-blue-400' };
      case 'manutencao':
        return { label: 'Manutenção Mensal', icon: Wrench, color: 'text-primary' };
      case 'ajuste':
        return { label: 'Ajuste / Alteração', icon: Layers, color: 'text-indigo-400' };
      case 'nova_feature':
        return { label: 'Nova Página / Feature', icon: Sparkles, color: 'text-emerald-400' };
      case 'bug':
        return { label: 'Bug / Correção', icon: Bug, color: 'text-red-400' };
      case 'geral':
        return { label: 'Geral', icon: Briefcase, color: 'text-muted-foreground' };
    }
  };

  // Render do Card individual da Tarefa
  const renderTaskCard = (task: TaskDemand) => {
    const priority = getPriorityBadge(task.priority);
    const typeInfo = getTypeBadge(task.type);
    const TypeIcon = typeInfo.icon;

    const isPersonal =
      task.scope === 'pessoal' ||
      task.type === 'projeto_pessoal' ||
      task.type === 'estudo' ||
      personalProjectSuggestions.some((p) => p.toLowerCase() === task.client.toLowerCase());

    return (
      <Card
        key={task.id}
        className={`border-border/60 transition-all hover:border-primary/40 shadow-sm flex flex-col justify-between group p-3.5 space-y-3 ${
          isPersonal ? 'bg-card/90 ring-1 ring-purple-500/20' : 'bg-card/80'
        }`}
      >
        {/* Top: Client/Project Tag & Priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {isPersonal ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-300 ring-1 ring-purple-500/30 truncate">
                <Rocket className="h-3 w-3 text-purple-400" />
                {task.client}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-bold text-foreground truncate">
                <Briefcase className="h-3 w-3 text-primary" />
                {task.client}
              </span>
            )}

            <span
              className={`inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-semibold ring-1 ${priority.color}`}
            >
              {priority.label}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleOpenEdit(task)}
              title="Editar"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDeletingTask(task)}
              title="Excluir"
              className="h-6 w-6 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground leading-snug">
            {task.title}
          </p>
          {task.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Meta info: Type, Due Date, Hours */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          <span className={`inline-flex items-center gap-1 font-medium ${typeInfo.color}`}>
            <TypeIcon className="h-3 w-3" />
            {typeInfo.label}
          </span>

          <div className="flex items-center gap-2">
            {task.hoursEstimate && task.hoursEstimate > 0 && (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground font-mono">
                <Timer className="h-3 w-3" />
                {task.hoursEstimate}h
              </span>
            )}

            {task.dueDate && (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Status Transition Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          {task.status === 'todo' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange(task.id, 'in_progress')}
              className="w-full text-[11px] h-7 gap-1 bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 ring-1 ring-cyan-500/30"
            >
              <span>Iniciar Tarefa</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}

          {task.status === 'in_progress' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusChange(task.id, 'todo')}
                className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                title="Voltar para A Fazer"
              >
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(task.id, 'done')}
                className="flex-1 text-[11px] h-7 gap-1 bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Concluir</span>
              </Button>
            </>
          )}

          {task.status === 'done' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(task.id, 'todo')}
              className="w-full text-[11px] h-7 gap-1 border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reabrir Demanda</span>
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Demandas
            </CardTitle>
            <ListTodo className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">clientes e projetos pessoais</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendentes / Na Fila
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">aguardando ou em execução</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concluídas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
            <p className="mt-1 text-xs text-muted-foreground">entregas finalizadas</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Carga Horária Estimada
            </CardTitle>
            <Timer className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{stats.totalHours}h</div>
            <p className="mt-1 text-xs text-muted-foreground">de esforço estimado total</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar & Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tarefa, cliente ou projeto pessoal..."
            className="pl-9 bg-secondary/40 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Escopo (Todos / Clientes / Pessoais) */}
          <div className="inline-flex rounded-lg border border-border/60 bg-secondary/40 p-0.5 text-xs">
            <button
              onClick={() => setFilterScope('all')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                filterScope === 'all' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterScope('cliente')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                filterScope === 'cliente' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              💼 Clientes
            </button>
            <button
              onClick={() => setFilterScope('pessoal')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                filterScope === 'pessoal' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🚀 Pessoais
            </button>
          </div>

          {/* Filtro de Cliente / Projeto */}
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="h-8 rounded-lg border border-border/60 bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos os Nomes</option>
            {distinctClients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Filtro de Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-8 rounded-lg border border-border/60 bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Prioridades</option>
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="media">🟡 Média</option>
            <option value="baixa">🟢 Baixa</option>
          </select>

          <Button
            size="sm"
            onClick={() => handleOpenNew('cliente')}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {/* COLUNA 1: A FAZER */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                A Fazer
              </h3>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400 ring-1 ring-amber-500/30">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {todoTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 py-12 text-center text-xs text-muted-foreground">
                Nenhuma tarefa pendente
              </div>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* COLUNA 2: EM ANDAMENTO */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Em Andamento
              </h3>
            </div>
            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-400 ring-1 ring-cyan-500/30">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {inProgressTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 py-12 text-center text-xs text-muted-foreground">
                Nenhuma tarefa em execução
              </div>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* COLUNA 3: CONCLUÍDO */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Concluído
              </h3>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              {doneTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {doneTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 py-12 text-center text-xs text-muted-foreground">
                Nenhuma tarefa finalizada ainda
              </div>
            ) : (
              doneTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição de Tarefa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <CheckSquare2 className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Demanda' : 'Nova Tarefa no Kanban'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre solicitações de clientes ou tarefas dos seus projetos pessoais para organizar seus sprints.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-sm">
            {/* Seletor de Escopo: Cliente vs Projeto Pessoal */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Escopo da Demanda</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      scope: 'cliente',
                      type: 'manutencao',
                      client: distinctClients.find((c) => !personalProjectSuggestions.includes(c)) || '',
                    })
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                    form.scope === 'cliente'
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Demanda de Cliente</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      scope: 'pessoal',
                      type: 'projeto_pessoal',
                      client: form.client && personalProjectSuggestions.includes(form.client) ? form.client : 'PromptVault',
                    })
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                    form.scope === 'pessoal'
                      ? 'border-purple-500 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30 font-bold'
                      : 'border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Rocket className="h-4 w-4" />
                  <span>Projeto Pessoal / Estudo</span>
                </button>
              </div>
            </div>

            {/* Título */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-title">Título da Demanda *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={
                  form.scope === 'pessoal'
                    ? 'Ex: Criar novo componente de animação no PromptVault'
                    : 'Ex: Atualizar banner da página inicial e links de ingressos'
                }
                className="bg-secondary/40"
                autoFocus
              />
            </div>

            {/* Cliente / Nome do Projeto e Tipo */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="task-client">
                  {form.scope === 'pessoal' ? 'Nome do Projeto Pessoal *' : 'Cliente Vinculado *'}
                </Label>
                <Input
                  id="task-client"
                  list="client-suggestions-list"
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder={form.scope === 'pessoal' ? 'Ex: PromptVault, CashFlow...' : 'Ex: XK Eventos'}
                  className="bg-secondary/40"
                />
                <datalist id="client-suggestions-list">
                  {form.scope === 'pessoal'
                    ? personalProjectSuggestions.map((c) => <option key={c} value={c} />)
                    : distinctClients.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="task-type">Tipo de Demanda</Label>
                <select
                  id="task-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {form.scope === 'pessoal' ? (
                    <>
                      <option value="projeto_pessoal">🚀 Projeto Pessoal / SaaS</option>
                      <option value="estudo">📚 Estudo / Aperfeiçoamento</option>
                      <option value="nova_feature">✨ Nova Feature / Página</option>
                      <option value="bug">🐛 Bug / Correção</option>
                      <option value="geral">💼 Geral</option>
                    </>
                  ) : (
                    <>
                      <option value="manutencao">🔧 Manutenção Mensal</option>
                      <option value="ajuste">📑 Ajuste / Alteração</option>
                      <option value="nova_feature">✨ Nova Página / Feature</option>
                      <option value="bug">🐛 Bug / Correção</option>
                      <option value="geral">💼 Geral</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Status e Prioridade */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="task-status">Status no Quadro</Label>
                <select
                  id="task-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="todo">📌 A Fazer</option>
                  <option value="in_progress">⏳ Em Andamento</option>
                  <option value="done">✅ Concluído</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="task-priority">Prioridade</Label>
                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
              </div>
            </div>

            {/* Prazo e Horas Estimadas */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="task-duedate">Prazo / Meta de Conclusão</Label>
                <Input
                  id="task-duedate"
                  type="date"
                  value={form.dueDate || ''}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="bg-secondary/40"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="task-hours">Estimativa de Tempo (Horas)</Label>
                <Input
                  id="task-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.hoursEstimate || ''}
                  onChange={(e) => setForm({ ...form, hoursEstimate: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 1.5"
                  className="bg-secondary/40 font-mono"
                />
              </div>
            </div>

            {/* Descrição Detalhada */}
            <div className="grid gap-1.5">
              <Label htmlFor="task-desc">Detalhes / Checklist da Tarefa</Label>
              <Textarea
                id="task-desc"
                rows={3}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Implementar animação com Framer Motion, testar responsividade no mobile..."
                className="bg-secondary/40 text-xs resize-none"
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
              onClick={handleSave}
              disabled={isSubmitting || !form.title.trim() || !form.client.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Criar Demanda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Demanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingTask?.title}"?
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
    </div>
  );
}
