import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/use-auth';
import { dashboardFor } from '@/lib/auth';
import { BrandLogo } from '@/components/brand-logo';

const links = [
  { label: 'Oportunidades', href: '/opportunities' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Para jóvenes', href: '#talento' },
  { label: 'Para empresas', href: '#empresas' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <BrandLogo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          {links.map((link) => <a key={link.href} className="text-sm text-slate-600 transition hover:text-slate-950" href={link.href}>{link.label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">{user ? <Button asChild size="sm"><Link to={dashboardFor(user.role)}>Mi espacio</Link></Button> : <><Button asChild variant="ghost" size="sm"><Link to="/login">Ingresar</Link></Button><Button asChild size="sm"><Link to="/register">Crear cuenta</Link></Button></>}</div>
        <button className="rounded-lg p-2 text-slate-800 md:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menú" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && <nav className="container flex flex-col gap-4 border-t border-slate-200 bg-white py-5 md:hidden">{links.map((link) => <a key={link.href} className="text-slate-700" href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}<Link className="font-semibold text-primary" to={user ? dashboardFor(user.role) : '/login'} onClick={() => setOpen(false)}>{user ? 'Mi espacio' : 'Ingresar'}</Link></nav>}
    </header>
  );
}
