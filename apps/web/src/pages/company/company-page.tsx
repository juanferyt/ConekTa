import {
  BriefcaseBusiness,
  Building2,
  FileText,
  Home,
  LogOut,
  Menu,
  UserRoundSearch,
  X,
  Hammer,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Bell, CalendarDays, MessageCircle } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/use-auth';
import { CompanyApplicants } from './company-applicants';
import { CompanyHome } from './company-home';
import { CompanyProfileSection } from './company-profile';
import { CompanyVacancies } from './company-vacancies';
import { CommunicationsPage } from '../communications-page';
import { CompanyExperiencesPage } from '../experiences/company-experiences';
import { PrivacyCenter } from '../privacy-center';

const nav = [
  { path: '/company', label: 'Resumen', icon: Home },
  { path: '/company/profile', label: 'Perfil de empresa', icon: Building2 },
  { path: '/company/vacancies', label: 'Vacantes', icon: BriefcaseBusiness },
  { path: '/company/candidates', label: 'Candidatos', icon: UserRoundSearch },
  { path: '/company/applications', label: 'Postulaciones', icon: FileText },
  { path: '/company/experiences', label: 'Experiencias / Retos', icon: Hammer },
  { path: '/company/messages', label: 'Mensajes', icon: MessageCircle },
  { path: '/company/interviews', label: 'Entrevistas', icon: CalendarDays },
  { path: '/company/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/company/privacy', label: 'Privacidad', icon: ShieldCheck },
];
export function CompanyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const content =
    location.pathname === '/company' ? (
      <CompanyHome />
    ) : location.pathname.endsWith('/profile') ? (
      <CompanyProfileSection />
    ) : location.pathname.endsWith('/vacancies') ? (
      <CompanyVacancies />
    ) : location.pathname.endsWith('/candidates') ? (
      <CompanyApplicants candidatesOnly />
    ) : location.pathname.endsWith('/applications') ? (
      <CompanyApplicants />
    ) : location.pathname.startsWith('/company/experiences') ? (
      <CompanyExperiencesPage />
    ) : location.pathname.endsWith('/messages') ? (
      <CommunicationsPage mode="messages" />
    ) : location.pathname.endsWith('/interviews') ? (
      <CommunicationsPage mode="interviews" />
    ) : location.pathname.endsWith('/notifications') ? (
      <CommunicationsPage mode="notifications" />
    ) : location.pathname.endsWith('/privacy') ? (
      <PrivacyCenter />
    ) : (
      <Navigate to="/company" replace />
    );
  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="min-h-screen bg-[#fbf8f9] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white px-5 lg:hidden">
        <button onClick={() => setOpen(true)}>
          <Menu />
        </button>
        <BrandLogo className="ml-4 h-10 w-36" />
      </header>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-rose-100 bg-gradient-to-b from-[#e94f63] to-[#d93d53] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <BrandLogo />
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition ${location.pathname === path ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 p-4">
          <p className="truncate px-4 pb-3 text-xs text-white/70">{user?.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-3 size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="min-h-screen pt-20 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-[1280px] px-5 py-9 sm:px-8 lg:px-10 lg:py-10">{content}</div>
      </main>
    </div>
  );
}
export function CompanyHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-primary text-xs font-bold uppercase tracking-[.16em]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
    </header>
  );
}
export function CompanyPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-rose-100/80 bg-white p-6 shadow-[0_8px_30px_-24px_rgba(39,26,29,.35)] ${className}`}>
      {children}
    </section>
  );
}
export function CompanyQueryState({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading)
    return (
      <CompanyPanel>
        <p className="text-slate-500">Cargando…</p>
      </CompanyPanel>
    );
  if (error)
    return (
      <CompanyPanel>
        <p className="text-red-600">No fue posible cargar la información.</p>
      </CompanyPanel>
    );
  return null;
}
