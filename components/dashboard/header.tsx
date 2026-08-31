'use client';

import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  search: string;
  onSearch: (v: string) => void;
  onNewEntry: () => void;
}

export function Header({ search, onSearch, onNewEntry }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar lançamentos, clientes..."
          className="border-border/60 bg-secondary/40 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/40"
        />
      </div>
      <div className="ml-auto">
        <Button
          onClick={onNewEntry}
          className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Entrada</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>
    </header>
  );
}
