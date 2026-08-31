'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import {
  LayoutDashboard,
  ArrowDownCircle,
  Briefcase,
  ListTodo,
  Bot,
  Sparkles,
  Target,
  LogOut,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

export type ActivePage = 'painel' | 'entradas' | 'clientes' | 'tarefas' | 'ia' | 'biblioteca' | 'metas';

interface SidebarProps {
  active: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

const menu: { id: ActivePage; label: string; icon: LucideIcon }[] = [
  { id: 'painel', label: 'Painel Geral', icon: LayoutDashboard },
  { id: 'entradas', label: 'Entradas de Caixa', icon: ArrowDownCircle },
  { id: 'clientes', label: 'Clientes & Projetos', icon: Briefcase },
  { id: 'tarefas', label: 'Tarefas & Demandas', icon: ListTodo },
  { id: 'ia', label: 'IA Estratégica', icon: Bot },
  { id: 'biblioteca', label: 'Biblioteca & Prompts', icon: Sparkles },
  { id: 'metas', label: 'Metas', icon: Target },
];

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Desconectado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sair.');
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || 'usuario@cashflow.app';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'CF';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            CashFlow
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Gestão de Entradas
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu Principal
        </p>
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="h-9 w-9 shrink-0 rounded-full ring-1 ring-border"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair da conta"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
