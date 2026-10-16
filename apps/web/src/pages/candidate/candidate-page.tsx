import {
  Award,
  BriefcaseBusiness,
  FileCheck2,
  FolderKanban,
  Gauge,
  Home,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Hammer,
  Fingerprint,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Bell, CalendarDays, MessageCircle } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/contexts/use-auth';
import { CandidateCertifications } from './certifications-section';
import { CandidateHome } from './home-section';
import { CandidateOpportunities } from './opportunities-section';
import { CandidateProfileSection } from './profile-section';
import { CandidateProjects } from './projects-section';
import { CandidateSkills } from './skills-section';
import { CommunicationsPage } from '../communications-page';
import { CandidateExperiencesPage } from '../experiences/candidate-experiences';
import { CandidateTalentPage } from '../talent/candidate-talent-page';
import { PrivacyCenter } from '../privacy-center';

const navigation = [
  { path: '/candidate', label: 'Inicio', icon: Home },
  { path: '/candidate/profile', label: 'Mi perfil', icon: UserRound },
  { path: '/candidate/skills', label: 'Habilidades', icon: Sparkles },
  { path: '/candidate/projects', label: 'Proyectos', icon: FolderKanban },
  { path: '/candidate/certifications', label: 'Certificaciones', icon: Award },
  { path: '/candidate/opportunities', label: 'Oportunidades', icon: BriefcaseBusiness },
  { path: '/candidate/applications', label: 'Mis postulaciones', icon: FileCheck2 },
  { path: '/candidate/experiences', label: 'Construye experiencia', icon: Hammer },
  { path: '/candidate/talent', label: 'Evidencia y pasaporte', icon: Fingerprint },
  { path: '/candidate/messages', label: 'Mensajes', icon: MessageCircle },
  { path: '/candidate/interviews', label: 'Entrevistas', icon: CalendarDays },
  { path: '/candidate/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/candidate/privacy', label: 'Privacidad', icon: ShieldCheck },
];

export function CandidatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const section =
    location.pathname === '/candidate' ? (
      <CandidateHome />
    ) : location.pathname.endsWith('/profile') ? (
      <CandidateProfileSection />
    ) : location.pathname.endsWith('/skills') ? (
      <CandidateSkills />
    ) : location.pathname.endsWith('/projects') ? (
      <CandidateProjects />
    ) : location.pathname.endsWith('/certifications') ? (
      <CandidateCertifications />
    ) : location.pathname.endsWith('/opportunities') ? (
      <CandidateOpportunities type="opportunities" />
    ) : location.pathname.endsWith('/applications') ? (
      <CandidateOpportunities type="applications" />
    ) : location.pathname.endsWith('/experiences') ? (
      <CandidateExperiencesPage />
    ) : location.pathname.endsWith('/talent') ? (
      <CandidateTalentPage />
    ) : location.pathname.endsWith('/messages') ? (
      <CommunicationsPage mode="messages" />
    ) : location.pathname.endsWith('/interviews') ? (
      <CommunicationsPage mode="interviews" />
    ) : location.pathname.endsWith('/notifications') ? (
      <CommunicationsPage mode="notifications" />
    ) : location.pathname.endsWith('/privacy') ? (
      <PrivacyCenter />
    ) : (
      <Navigate to="/candidate" replace />
    );
  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="candidate-app min-h-screen bg-[#fbf8f9] text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white px-5 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir navegación">
          <Menu />
        </button>
        <BrandLogo className="ml-4 h-10 w-36" />
      </header>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-rose-100 bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center justify-between px-7">
          <BrandLogo />
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {navigation.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition ${active ? 'bg-rose-50 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate px-4 pb-3 text-xs text-slate-500">{user?.email}</p>
          <Button className="w-full justify-start" variant="ghost" onClick={signOut}>
            <LogOut className="mr-3 size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="min-h-screen pt-20 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-[1280px] px-5 py-9 sm:px-8 lg:px-10 lg:py-10">{section}</div>
      </main>
    </div>
  );
}

export function SectionHeading({
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
      <p className="text-primary text-xs font-bold uppercase tracking-[.18em]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
    </header>
  );
}
export function Panel({
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
export function QueryState({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading)
    return (
      <Panel>
        <p className="animate-pulse text-slate-400">Cargando información…</p>
      </Panel>
    );
  if (error)
    return (
      <Panel>
        <p className="text-red-300">No fue posible cargar la información. Intenta nuevamente.</p>
      </Panel>
    );
  return null;
}
export function CompletionRing({ percentage }: { percentage: number }) {
  return (
    <div
      className="relative grid size-32 place-items-center rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${percentage}%, rgb(226 232 240) 0)`,
      }}
    >
      <div className="grid size-24 place-items-center rounded-full bg-white">
        <div className="text-center">
          <Gauge className="text-primary mx-auto size-5" />
          <strong className="mt-1 block text-2xl text-slate-950">{percentage}%</strong>
        </div>
      </div>
    </div>
  );
}
