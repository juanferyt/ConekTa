import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/use-auth';
import { BrandLogo } from '@/components/brand-logo';

export function DashboardShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-slate-200 bg-white"><div className="container flex h-20 items-center justify-between"><BrandLogo /><div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">{user?.email}</span><Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 size-4" /> Salir</Button></div></div></header><main className="container py-12"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="mt-3 text-4xl font-bold text-slate-950">{title}</h1><div className="mt-9">{children}</div></main></div>;
}
