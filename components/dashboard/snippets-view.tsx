'use client';

import { useState, useMemo } from 'react';
import { SnippetResource, SnippetCategory, NewSnippetInput } from '@/lib/types';
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
  Copy,
  Check,
  Code2,
  Sparkles,
  Bot,
  Layers,
  Wrench,
  Link as LinkIcon,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  Terminal,
  Bookmark,
  Globe,
  Cpu,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface SnippetsViewProps {
  snippets: SnippetResource[];
  onSaveSnippet: (snippet: NewSnippetInput, id?: string) => Promise<void>;
  onDeleteSnippet: (id: string) => Promise<void>;
}

const emptyForm: NewSnippetInput = {
  title: '',
  category: 'prompt_ia',
  targetTool: '',
  description: '',
  content: '',
  tags: [],
  linkUrl: '',
  language: 'markdown',
};

const toolSuggestions = [
  'ChatGPT',
  'Google Labs',
  'Claude AI',
  'Midjourney',
  'Cursor',
  'VS Code / React',
  'Next.js',
  'Bolt.new',
  'v0.dev',
];

export function SnippetsView({
  snippets,
  onSaveSnippet,
  onDeleteSnippet,
}: SnippetsViewProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | SnippetCategory>('all');
  const [filterTool, setFilterTool] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<NewSnippetInput>(emptyForm);
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingSnippet, setDeletingSnippet] = useState<SnippetResource | null>(null);

  // Link do seu site externo de prompts/componentes (PromptVault)
  const [toolkitSiteUrl, setToolkitSiteUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cf_toolkit_url') || 'https://prompvault.netlify.app/';
    }
    return 'https://prompvault.netlify.app/';
  });
  const [isEditingSiteUrl, setIsEditingSiteUrl] = useState(false);
  const [tempSiteUrl, setTempSiteUrl] = useState(toolkitSiteUrl);

  const handleSaveSiteUrl = () => {
    localStorage.setItem('cf_toolkit_url', tempSiteUrl.trim());
    setToolkitSiteUrl(tempSiteUrl.trim());
    setIsEditingSiteUrl(false);
    toast.success('Link da sua plataforma de componentes salvo!');
  };

  // Lista de ferramentas distintas encontradas nos snippets para filtro
  const availableTools = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => {
      if (s.targetTool && s.targetTool.trim()) {
        set.add(s.targetTool.trim());
      }
    });
    return Array.from(set);
  }, [snippets]);

  // Filtragem
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snippets.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.content.toLowerCase().includes(q) ||
        (item.targetTool && item.targetTool.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterTool !== 'all' && item.targetTool !== filterTool) return false;
      return true;
    });
  }, [snippets, search, filterCategory, filterTool]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado para a área de transferência! 📋');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenNew = () => {
    setEditingId(undefined);
    setForm(emptyForm);
    setTagsInput('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: SnippetResource) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      targetTool: item.targetTool || '',
      description: item.description || '',
      content: item.content,
      tags: item.tags || [],
      linkUrl: item.linkUrl || '',
      language: item.language || 'markdown',
    });
    setTagsInput((item.tags || []).join(', '));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Preencha o título e o conteúdo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsList = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onSaveSnippet(
        {
          ...form,
          title: form.title.trim(),
          targetTool: form.targetTool ? form.targetTool.trim() : undefined,
          tags: tagsList,
        },
        editingId
      );

      toast.success('Salvo na sua Biblioteca! 🎉');
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSnippet) return;
    setIsSubmitting(true);
    try {
      await onDeleteSnippet(deletingSnippet.id);
      toast.success('Excluído com sucesso.');
      setDeletingSnippet(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: SnippetCategory) => {
    switch (cat) {
      case 'prompt_ia':
        return { label: 'Prompt IA', icon: Bot, color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' };
      case 'componente_ui':
        return { label: 'Componente UI', icon: Layers, color: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/30' };
      case 'script_util':
        return { label: 'Script / Snippet', icon: Terminal, color: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30' };
      case 'ferramenta_link':
        return { label: 'Link / Ferramenta', icon: LinkIcon, color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' };
    }
  };

  // Helper para cor da ferramenta alvo
  const getToolBadgeColor = (tool?: string) => {
    if (!tool) return '';
    const t = tool.toLowerCase();
    if (t.includes('chatgpt') || t.includes('openai')) return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
    if (t.includes('google') || t.includes('labs') || t.includes('gemini')) return 'bg-blue-500/15 text-blue-300 ring-blue-500/30';
    if (t.includes('claude') || t.includes('anthropic')) return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
    if (t.includes('midjourney')) return 'bg-purple-500/15 text-purple-300 ring-purple-500/30';
    return 'bg-secondary/70 text-foreground ring-border/60';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Bar & Categorias */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por prompt, ferramenta (ChatGPT, Labs...) ou tag..."
            className="pl-9 bg-secondary/40 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'prompt_ia', label: '🤖 Prompts IA' },
            { id: 'componente_ui', label: '🧩 Componentes' },
            { id: 'script_util', label: '🛠️ Scripts' },
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

          {availableTools.length > 0 && (
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="h-8 rounded-lg border border-border/60 bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas Ferramentas</option>
              {availableTools.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          <a
            href={toolkitSiteUrl.startsWith('http') ? toolkitSiteUrl : `https://${toolkitSiteUrl}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all shrink-0"
            title="Abrir seu site PromptVault"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>PromptVault</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>

          <Button
            size="sm"
            onClick={handleOpenNew}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Prompt / Componente</span>
          </Button>
        </div>
      </div>

      {/* Grid de Prompts e Componentes */}
      {filteredList.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/30 p-12 text-center">
          <Code2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">Nenhum prompt ou componente encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Cadastre seus prompts de IA favoritos ou componentes React para copiar com 1 clique durante o desenvolvimento.
          </p>
          <Button
            size="sm"
            onClick={handleOpenNew}
            className="mt-4 gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Primeiro Prompt
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredList.map((item) => {
            const badge = getCategoryBadge(item.category);
            const BadgeIcon = badge.icon;
            const isCopied = copiedId === item.id;

            return (
              <Card
                key={item.id}
                className="border-border/60 bg-card/60 transition-all hover:border-primary/40 shadow-sm flex flex-col justify-between group"
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${badge.color}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>

                      {/* BADGE ONDE USAR (Apenas quando for Prompt de IA) */}
                      {item.category === 'prompt_ia' && item.targetTool && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${getToolBadgeColor(
                            item.targetTool
                          )}`}
                        >
                          <Zap className="h-3 w-3" />
                          <span>Usar no: {item.targetTool}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(item)}
                        title="Editar"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingSnippet(item)}
                        title="Excluir"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <CardTitle className="text-sm font-semibold text-foreground line-clamp-1 mt-2">
                    {item.title}
                  </CardTitle>
                  {item.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Code / Content Box */}
                  <div className="relative rounded-lg border border-border/60 bg-secondary/30 p-3 font-mono text-xs text-muted-foreground group-hover:border-border/80 transition-colors">
                    <pre className="max-h-[140px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words scrollbar-thin text-[11px] leading-relaxed select-all">
                      {item.content}
                    </pre>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-border/50 bg-secondary/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleCopy(item.id, item.content)}
                      className={`w-full text-xs gap-1.5 transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar Código / Prompt'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Prompt / Componente' : 'Novo Prompt ou Componente'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Guarde os prompts que você mais usa, onde rodar e blocos de código prontos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-sm">
            {/* Título e Categoria */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="item-title">Título *</Label>
                <Input
                  id="item-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Campanha Publicitária de Alta Conversão"
                  className="bg-secondary/40"
                  autoFocus
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="item-category">Tipo de Recurso</Label>
                <select
                  id="item-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as SnippetCategory })}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="prompt_ia">🤖 Prompt de IA</option>
                  <option value="componente_ui">🧩 Componente UI / React</option>
                  <option value="script_util">🛠️ Script / Helper</option>
                  <option value="ferramenta_link">🔗 Link / Ferramenta</option>
                </select>
              </div>
            </div>

            {/* Onde Usar (Apenas exibido quando for Prompt de IA) */}
            {form.category === 'prompt_ia' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="item-targetTool" className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Zap className="h-3.5 w-3.5" />
                    Onde Usar? (Ferramenta / IA)
                  </Label>
                  <Input
                    id="item-targetTool"
                    list="tool-suggestions"
                    value={form.targetTool || ''}
                    onChange={(e) => setForm({ ...form, targetTool: e.target.value })}
                    placeholder="Ex: ChatGPT, Google Labs, Midjourney..."
                    className="bg-secondary/40 font-medium text-xs"
                  />
                  <datalist id="tool-suggestions">
                    {toolSuggestions.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="item-link">Link da Ferramenta de IA (URL)</Label>
                  <Input
                    id="item-link"
                    value={form.linkUrl || ''}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://chatgpt.com/ ou https://labs.google/"
                    className="bg-secondary/40 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="item-link">Link de Referência / Documentação (opcional)</Label>
                <Input
                  id="item-link"
                  value={form.linkUrl || ''}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="https://tailwindcss.com ou link do componente"
                  className="bg-secondary/40 font-mono text-xs"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="item-desc">Descrição / Quando Usar</Label>
              <Input
                id="item-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Use quando o cliente enviar foto do produto sem fundo..."
                className="bg-secondary/40 text-xs"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="item-content">Conteúdo do Prompt ou Código *</Label>
              <Textarea
                id="item-content"
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Cole aqui o texto do prompt de IA ou o código do componente..."
                className="bg-secondary/40 font-mono text-xs resize-y"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="item-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="item-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Ads, Instagram, E-commerce, Prompt"
                className="bg-secondary/40 text-xs"
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
              disabled={isSubmitting || !form.title.trim() || !form.content.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Conectar Link do Site de Prompts */}
      <Dialog open={isEditingSiteUrl} onOpenChange={setIsEditingSiteUrl}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Link do seu Site de Prompts & Componentes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira a URL do seu site onde você armazena seus prompts e componentes para abrir com 1 clique no topo desta aba.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="toolkit-url" className="text-xs">URL do Site</Label>
            <Input
              id="toolkit-url"
              value={tempSiteUrl}
              onChange={(e) => setTempSiteUrl(e.target.value)}
              placeholder="https://prompvault.netlify.app"
              className="bg-secondary/40 font-mono text-xs mt-1"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditingSiteUrl(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSiteUrl}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingSnippet} onOpenChange={(open) => !open && setDeletingSnippet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingSnippet?.title}" da sua biblioteca?
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
