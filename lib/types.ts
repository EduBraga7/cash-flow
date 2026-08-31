export type EntryType = 'recorrente' | 'avulso';
export type EntryStatus = 'recebido' | 'a_receber';

export interface Entry {
  id: string;
  description: string;
  client: string;
  value: number;
  type: EntryType;
  status: EntryStatus;
  date: string; // YYYY-MM-DD
  createdAt: string;
  contractMonths?: number;
  installment?: string;
}

export interface NewEntryInput {
  description: string;
  client: string;
  value: number;
  type: EntryType;
  status: EntryStatus;
  date: string;
  contractMonths?: number;
}

export type ClientCategory = 'comercial' | 'portfolio' | 'pessoal';

export interface ClientProject {
  id: string;
  name: string;
  category: ClientCategory;
  phone?: string;
  email?: string;
  siteUrl?: string;
  githubUrl?: string;
  contractPdfUrl?: string;
  notes?: string;
  techStack?: string[]; // Ex: ["React", "Next.js", "Firebase", "Tailwind"]
  createdAt?: string;
  updatedAt?: string;
}

export type NewClientProjectInput = Omit<ClientProject, 'id'>;

export type SnippetCategory = 'prompt_ia' | 'componente_ui' | 'script_util' | 'ferramenta_link';

export interface SnippetResource {
  id: string;
  title: string;
  category: SnippetCategory;
  description?: string;
  content: string;
  tags: string[];
  targetTool?: string; // Ex: 'ChatGPT', 'Google Labs', 'Midjourney', 'Cursor', 'VS Code'
  linkUrl?: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NewSnippetInput = Omit<SnippetResource, 'id'>;

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskType =
  | 'manutencao'
  | 'ajuste'
  | 'nova_feature'
  | 'bug'
  | 'projeto_pessoal'
  | 'estudo'
  | 'geral';

export interface TaskDemand {
  id: string;
  title: string;
  client: string; // Pode ser nome de cliente (ex: 'XK Eventos') ou de projeto pessoal (ex: 'PromptVault')
  scope?: 'cliente' | 'pessoal'; // Define se é demanda de cliente ou projeto pessoal/interno
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate?: string; // YYYY-MM-DD
  description?: string;
  hoursEstimate?: number;
  createdAt: string;
  completedAt?: string;
}

export type NewTaskInput = Omit<TaskDemand, 'id' | 'createdAt' | 'completedAt'>;

export type FilterKey =
  | 'todos'
  | 'recebidos'
  | 'pendente_recebido'
  | 'recorrentes'
  | 'avulsos';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const currency = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

/**
 * Converte com precisão uma string de data (YYYY-MM-DD ou ISO) sem sofrer desvio de fuso horário UTC
 */
export const parseLocalDate = (dateStr: string) => {
  if (!dateStr) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      date: now,
    };
  }

  const raw = dateStr.slice(0, 10);
  const parts = raw.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-11
    const day = parseInt(parts[2], 10);
    return {
      year,
      month,
      day,
      date: new Date(year, month, day, 12, 0, 0),
    };
  }

  const d = new Date(dateStr);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    date: d,
  };
};

export const formatDate = (iso: string) => {
  if (!iso) return '';
  const { day, month, year } = parseLocalDate(iso);
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ];
  const formattedDay = String(day).padStart(2, '0');
  return `${formattedDay} de ${months[month]}. de ${year}`;
};
