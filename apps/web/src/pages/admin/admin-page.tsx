import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  Award,
  Trash2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import {
  Breadcrumbs,
  Dialog,
  EmptyState,
  MetricCard,
  SkeletonGrid,
  StatusBadge,
  Toast,
} from '@/components/dashboard-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/use-auth';
import { apiFetch } from '@/lib/api-client';
import type {
  AdminApplication,
  AdminCandidate,
  AdminCompany,
  AdminMetrics,
  AdminSkill,
  AdminUser,
  AdminVacancy,
  PageResult,
} from './admin-types';

const nav = [
  { path: '/admin', label: 'Dashboard', icon: BarChart3 },
  { path: '/admin/users', label: 'Usuarios', icon: Users },
  { path: '/admin/candidates', label: 'Candidatos', icon: UserRound },
  { path: '/admin/companies', label: 'Empresas', icon: Building2 },
  { path: '/admin/vacancies', label: 'Vacantes', icon: BriefcaseBusiness },
  { path: '/admin/applications', label: 'Postulaciones', icon: FileCheck2 },
  { path: '/admin/skills', label: 'Habilidades', icon: Sparkles },
  { path: '/admin/experiences', label: 'Experiencias', icon: Award },
  { path: '/admin/deletions', label: 'Eliminaciones', icon: Trash2 },
];
export function AdminPage() {
  const location = useLocation(),
    navigate = useNavigate(),
    auth = useAuth();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' }>();
  const notify = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(undefined), 2500);
  };
  const content =
    location.pathname === '/admin' ? (
      <AdminDashboard />
    ) : location.pathname.endsWith('/users') ? (
      <UsersSection notify={notify} />
    ) : location.pathname.endsWith('/candidates') ? (
      <CandidatesSection />
    ) : location.pathname.endsWith('/companies') ? (
      <CompaniesSection notify={notify} />
    ) : location.pathname.endsWith('/vacancies') ? (
      <VacanciesSection notify={notify} />
    ) : location.pathname.endsWith('/applications') ? (
      <ApplicationsSection />
    ) : location.pathname.endsWith('/skills') ? (
      <SkillsSection notify={notify} />
    ) : location.pathname.endsWith('/experiences') ? (
      <AdminExperiences notify={notify} />
    ) : location.pathname.endsWith('/deletions') ? (
      <DeletionRequestsSection notify={notify} />
    ) : (
      <Navigate to="/admin" replace />
    );
  const logout = async () => {
    await auth.logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b bg-white px-5 lg:hidden">
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <BrandLogo />
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="mx-4 mb-5 rounded-xl bg-slate-950 p-4 text-white">
          <p className="text-primary text-xs uppercase tracking-wider">Administración</p>
          <p className="mt-1 truncate text-sm">{auth.user?.email}</p>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${location.pathname === path ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-3 size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="min-h-screen pt-20 lg:ml-72 lg:pt-0">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:py-10">{content}</div>
      </main>
      {toast && <Toast {...toast} />}
    </div>
  );
}

interface AdminExperience {
  id: string;
  title: string;
  status: string;
  company: { name?: string };
  _count: { applications: number };
}
interface AdminExperienceApplication {
  id: string;
  status: string;
  compatibilityScore: number;
  candidate: { firstName?: string; lastName?: string };
  experience: { title: string; company: { name?: string } };
}
interface AdminExperienceCertificate {
  id: string;
  code: string;
  status: string;
  issuedAt: string;
  verifiedExperience: {
    title: string;
    companyName: string;
    candidate: { firstName?: string; lastName?: string };
  };
}
function AdminExperiences({
  notify,
}: {
  notify: (message: string, tone?: 'success' | 'error') => void;
}) {
  const qc = useQueryClient();
  const experiences = useQuery({
    queryKey: ['admin-experiences'],
    queryFn: () => apiFetch<AdminExperience[]>('/admin/experiences'),
  });
  const applications = useQuery({
    queryKey: ['admin-experience-applications'],
    queryFn: () => apiFetch<AdminExperienceApplication[]>('/admin/experience-applications'),
  });
  const certificates = useQuery({
    queryKey: ['admin-experience-certificates'],
    queryFn: () => apiFetch<AdminExperienceCertificate[]>('/admin/experience-certificates'),
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/experience-certificates/${id}/revoke`, { method: 'PATCH' }),
    onSuccess: () => {
      notify('Certificado revocado y auditado');
      void qc.invalidateQueries({ queryKey: ['admin-experience-certificates'] });
    },
    onError: () => notify('No fue posible revocar el certificado', 'error'),
  });
  return (
    <>
      <Heading
        section="Experiencias"
        title="Auditoría de experiencia práctica"
        description="Consulta retos, postulaciones y certificados verificables."
      />
      {experiences.isLoading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold">Retos y proyectos</h2>
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4">Proyecto</th>
                    <th>Empresa</th>
                    <th>Postulaciones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {experiences.data?.map((item) => (
                    <tr className="border-t" key={item.id}>
                      <td className="p-4 font-medium">{item.title}</td>
                      <td>{item.company.name}</td>
                      <td>{item._count.applications}</td>
                      <td>
                        <StatusBadge>{item.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">Postulaciones de experiencia</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {applications.data?.map((item) => (
                <div className="rounded-xl border bg-white p-4" key={item.id}>
                  <p className="font-semibold">
                    {item.candidate.firstName} {item.candidate.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.experience.title} · {item.compatibilityScore}%
                  </p>
                  <StatusBadge>{item.status}</StatusBadge>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">Certificados</h2>
            <div className="space-y-3">
              {certificates.data?.map((item) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"
                  key={item.id}
                >
                  <div>
                    <p className="font-mono text-sm font-semibold">{item.code}</p>
                    <p className="text-sm text-slate-500">
                      {item.verifiedExperience.candidate.firstName}{' '}
                      {item.verifiedExperience.candidate.lastName} · {item.verifiedExperience.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge>{item.status}</StatusBadge>
                    {item.status === 'ACTIVE' && (
                      <Button variant="outline" size="sm" onClick={() => revoke.mutate(item.id)}>
                        Revocar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Heading({
  section,
  title,
  description,
}: {
  section: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Administración', to: '/admin' }, { label: section }]} />
      <header className="mb-7">
        <p className="text-primary text-xs font-bold uppercase tracking-[.16em]">Panel ConekTa</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </header>
    </>
  );
}
function AdminDashboard() {
  const query = useQuery({
    queryKey: ['admin-dashboard-v2'],
    queryFn: () => apiFetch<AdminMetrics>('/admin/dashboard'),
  });
  if (query.isLoading)
    return (
      <>
        <Heading
          section="Dashboard"
          title="Resumen de la plataforma"
          description="Información real de PostgreSQL."
        />
        <SkeletonGrid count={7} />
      </>
    );
  if (query.isError)
    return (
      <EmptyState
        title="No pudimos cargar las métricas"
        description="Comprueba la API e intenta de nuevo."
      />
    );
  const d = query.data!;
  const cards = [
    ['Usuarios registrados', d.users, Users],
    ['Candidatos', d.candidates, UserRound],
    ['Empresas', d.companies, Building2],
    ['Empresas activas', d.activeCompanies, ShieldCheck],
    ['Vacantes publicadas', d.publishedVacancies, BriefcaseBusiness],
    ['Postulaciones', d.applications, FileCheck2],
    ['Candidatos seleccionados', d.selectedCandidates, Sparkles],
  ] as const;
  return (
    <>
      <Heading
        section="Dashboard"
        title="Resumen de la plataforma"
        description="Tu talento merece una primera oportunidad. Supervisa la operación sin alterar sus datos de origen."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, icon]) => (
          <MetricCard key={label} label={label} value={value} icon={icon} />
        ))}
      </div>
    </>
  );
}
function usePaged<T>(key: string, path: string) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [applied, setApplied] = useState('');
  const query = useQuery({
    queryKey: [key, page, applied, path],
    queryFn: () =>
      apiFetch<PageResult<T>>(
        `${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=10&search=${encodeURIComponent(applied)}`,
      ),
  });
  return {
    query,
    page,
    setPage,
    search,
    setSearch,
    apply: () => {
      setPage(1);
      setApplied(search);
    },
  };
}
function SearchBar({
  value,
  onChange,
  onSubmit,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  children?: ReactNode;
}) {
  return (
    <form
      className="mb-5 flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar…"
      />
      <div className="flex gap-2">
        {children}
        <Button>Buscar</Button>
      </div>
    </form>
  );
}
function Pager({
  data,
  page,
  setPage,
}: {
  data?: { pages: number; total: number };
  page: number;
  setPage: (n: number) => void;
}) {
  if (!data || data.pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between text-sm">
      <span className="text-slate-500">{data.total} registros</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Anterior
        </Button>
        <span className="px-2 py-2">
          {page}/{data.pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === data.pages}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
function TableState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
}) {
  if (loading) return <SkeletonGrid count={3} />;
  if (error)
    return <EmptyState title="No fue posible cargar los datos" description="Intenta nuevamente." />;
  if (empty)
    return (
      <EmptyState
        title="Sin resultados"
        description="No existen registros para los filtros seleccionados."
      />
    );
  return null;
}

function UsersSection({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const [role, setRole] = useState('');
  const state = usePaged<AdminUser>('admin-users-v2', `/admin/users${role ? `?role=${role}` : ''}`);
  const [selected, setSelected] = useState<AdminUser>();
  const client = useQueryClient();
  const action = useMutation({
    mutationFn: (user: AdminUser) =>
      apiFetch(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !user.active }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-users-v2'] });
      notify('Estado del usuario actualizado');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  return (
    <>
      <Heading
        section="Usuarios"
        title="Usuarios"
        description="Busca, filtra y administra el acceso a la plataforma."
      />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply}>
        <select
          className="rounded-xl border px-3 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">Todos los roles</option>
          <option value="CANDIDATE">Candidatos</option>
          <option value="COMPANY">Empresas</option>
          <option value="ADMIN">Administradores</option>
        </select>
      </SearchBar>
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable headers={['Correo', 'Rol', 'Estado', 'Registro', 'Acciones']}>
          {state.query.data.items.map((user) => (
            <tr key={user.id}>
              <Cell>{user.email}</Cell>
              <Cell>
                <StatusBadge tone="primary">{user.role}</StatusBadge>
              </Cell>
              <Cell>
                <StatusBadge tone={user.active ? 'success' : 'neutral'}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </StatusBadge>
              </Cell>
              <Cell>{new Date(user.createdAt).toLocaleDateString('es-CO')}</Cell>
              <Cell>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(user)}>
                    Detalle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => action.mutate(user)}
                  >
                    {user.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
      <Dialog
        open={Boolean(selected)}
        title="Detalle del usuario"
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <Detail
            values={{
              Correo: selected.email,
              Rol: selected.role,
              Estado: selected.active ? 'Activo' : 'Inactivo',
              'Correo verificado': selected.emailVerified ? 'Sí' : 'No',
              Registro: new Date(selected.createdAt).toLocaleString('es-CO'),
              ID: selected.id,
            }}
          />
        )}
      </Dialog>
    </>
  );
}
function CandidatesSection() {
  const state = usePaged<AdminCandidate>('admin-candidates', '/admin/candidates');
  return (
    <>
      <Heading
        section="Candidatos"
        title="Candidatos"
        description="Consulta perfiles y actividad registrada."
      />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply} />
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable
          headers={['Candidato', 'Correo', 'Estado', 'Habilidades', 'Proyectos', 'Postulaciones']}
        >
          {state.query.data.items.map((item) => (
            <tr key={item.id}>
              <Cell>
                <strong>
                  {[item.firstName, item.lastName].filter(Boolean).join(' ') ||
                    'Perfil por completar'}
                </strong>
                <p className="text-xs text-slate-500">{item.headline}</p>
              </Cell>
              <Cell>{item.user.email}</Cell>
              <Cell>
                <StatusBadge tone={item.user.active ? 'success' : 'neutral'}>
                  {item.user.active ? 'Activo' : 'Inactivo'}
                </StatusBadge>
              </Cell>
              <Cell>{item._count.skills}</Cell>
              <Cell>{item._count.projects}</Cell>
              <Cell>{item._count.applications}</Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
    </>
  );
}
function CompaniesSection({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const [verification, setVerification] = useState('');
  const state = usePaged<AdminCompany>(
    'admin-companies',
    `/admin/companies${verification ? `?verificationStatus=${verification}` : ''}`,
  );
  const client = useQueryClient();
  const mutate = useMutation({
    mutationFn: ({ id, path, body }: { id: string; path: string; body: object }) =>
      apiFetch(`/admin/companies/${id}/${path}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-companies'] });
      notify('Empresa actualizada');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  return (
    <>
      <Heading
        section="Empresas"
        title="Empresas"
        description="Revisa identidad, actividad y verificación empresarial."
      />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply}>
        <select
          className="rounded-xl border px-3 text-sm"
          value={verification}
          onChange={(event) => setVerification(event.target.value)}
        >
          <option value="">Toda verificación</option>
          <option value="UNVERIFIED">Sin verificar</option>
          <option value="PENDING">Pendiente</option>
          <option value="VERIFIED">Verificada</option>
          <option value="REJECTED">Rechazada</option>
        </select>
      </SearchBar>
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable
          headers={['Empresa', 'Contacto', 'Verificación', 'Actividad', 'Vacantes', 'Acciones']}
        >
          {state.query.data.items.map((item) => (
            <tr key={item.id}>
              <Cell>
                <strong>{item.name ?? 'Empresa por completar'}</strong>
                <p className="text-xs text-slate-500">{item.nit ?? item.sector}</p>
              </Cell>
              <Cell>{item.user.email}</Cell>
              <Cell>
                <StatusBadge tone={item.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                  {item.verificationStatus}
                </StatusBadge>
              </Cell>
              <Cell>{item.user.active ? 'Activa' : 'Inactiva'}</Cell>
              <Cell>{item._count.vacancies}</Cell>
              <Cell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutate.mutate({
                        id: item.id,
                        path: 'status',
                        body: { active: !item.user.active },
                      })
                    }
                  >
                    {item.user.active ? 'Desactivar' : 'Activar'}
                  </Button>
                  {item.verificationStatus !== 'VERIFIED' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        mutate.mutate({
                          id: item.id,
                          path: 'verification',
                          body: { status: 'VERIFIED' },
                        })
                      }
                    >
                      Verificar
                    </Button>
                  )}
                  {item.verificationDocumentUrl && (
                    <Button size="sm" variant="outline" onClick={async () => { const result = await apiFetch<{url:string}>(`/files/${item.verificationDocumentUrl}/download-url`); window.open(result.url, '_blank', 'noopener,noreferrer'); }}>Ver documento</Button>
                  )}
                  {item.verificationStatus === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const reason = window.prompt('Motivo del rechazo');
                        if (reason)
                          mutate.mutate({
                            id: item.id,
                            path: 'verification',
                            body: { status: 'REJECTED', reason },
                          });
                      }}
                    >
                      Rechazar
                    </Button>
                  )}
                </div>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
    </>
  );
}

type DeletionRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestedAt: string;
  adminNote?: string;
  user: {
    email: string;
    role: string;
    candidateProfile?: { firstName?: string; lastName?: string };
    companyProfile?: { name?: string };
  };
};
function DeletionRequestsSection({
  notify,
}: {
  notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-deletions'],
    queryFn: () => apiFetch<DeletionRequest[]>('/admin/deletion-requests'),
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeletionRequest['status'] }) => {
      const adminNote = window.prompt('Nota administrativa (opcional)') ?? undefined;
      return apiFetch(`/admin/deletion-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote }),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-deletions'] });
      notify('Solicitud actualizada');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  return (
    <>
      <Heading
        section="Privacidad"
        title="Solicitudes de eliminación"
        description="Revisa, aprueba y completa la anonimización de cuentas con trazabilidad."
      />
      <TableState
        loading={query.isLoading}
        error={query.isError}
        empty={query.data?.length === 0}
      />
      {query.data?.length ? (
        <AdminTable headers={['Titular', 'Rol', 'Solicitud', 'Estado', 'Acciones']}>
          {query.data.map((item) => (
            <tr key={item.id}>
              <Cell>
                <strong>
                  {(item.user.companyProfile?.name ??
                    [item.user.candidateProfile?.firstName, item.user.candidateProfile?.lastName]
                      .filter(Boolean)
                      .join(' ')) ||
                    item.user.email}
                </strong>
                <p className="text-xs text-slate-500">{item.user.email}</p>
              </Cell>
              <Cell>{item.user.role}</Cell>
              <Cell>{new Date(item.requestedAt).toLocaleString('es-CO')}</Cell>
              <Cell>
                <StatusBadge
                  tone={
                    item.status === 'COMPLETED'
                      ? 'success'
                      : item.status === 'REJECTED'
                        ? 'neutral'
                        : 'warning'
                  }
                >
                  {item.status}
                </StatusBadge>
              </Cell>
              <Cell>
                <div className="flex flex-wrap gap-2">
                  {item.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: item.id, status: 'APPROVED' })}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review.mutate({ id: item.id, status: 'REJECTED' })}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {item.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Se anonimizará la cuenta y se desactivará el acceso. ¿Continuar?',
                          )
                        )
                          review.mutate({ id: item.id, status: 'COMPLETED' });
                      }}
                    >
                      Completar anonimización
                    </Button>
                  )}
                </div>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
    </>
  );
}
function VacanciesSection({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const [status, setStatus] = useState('');
  const state = usePaged<AdminVacancy>(
    'admin-vacancies',
    `/admin/vacancies${status ? `?status=${status}` : ''}`,
  );
  const client = useQueryClient();
  const action = useMutation({
    mutationFn: (item: AdminVacancy) =>
      apiFetch(`/admin/vacancies/${item.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ hidden: !item.adminHidden }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-vacancies'] });
      notify('Visibilidad de la vacante actualizada');
    },
  });
  return (
    <>
      <Heading
        section="Vacantes"
        title="Vacantes"
        description="Revisa oportunidades y la empresa responsable."
      />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply}>
        <select
          className="rounded-xl border px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="PUBLISHED">Publicada</option>
          <option value="CLOSED">Cerrada</option>
          <option value="ARCHIVED">Archivada</option>
        </select>
      </SearchBar>
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable
          headers={['Vacante', 'Empresa', 'Estado', 'Visibilidad', 'Postulaciones', 'Acción']}
        >
          {state.query.data.items.map((item) => (
            <tr key={item.id}>
              <Cell>
                <strong>{item.title}</strong>
                <p className="text-xs text-slate-500">{item.city}</p>
              </Cell>
              <Cell>{item.company.name ?? item.company.user.email}</Cell>
              <Cell>
                <StatusBadge>{item.status}</StatusBadge>
              </Cell>
              <Cell>
                <StatusBadge tone={item.adminHidden ? 'warning' : 'success'}>
                  {item.adminHidden ? 'Oculta' : 'Visible'}
                </StatusBadge>
              </Cell>
              <Cell>{item._count.applications}</Cell>
              <Cell>
                <Button size="sm" variant="outline" onClick={() => action.mutate(item)}>
                  {item.adminHidden ? 'Restaurar' : 'Ocultar'}
                </Button>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
    </>
  );
}
function ApplicationsSection() {
  const state = usePaged<AdminApplication>('admin-applications-audit', '/admin/applications');
  const [selected, setSelected] = useState<AdminApplication>();
  return (
    <>
      <Heading
        section="Postulaciones"
        title="Postulaciones"
        description="Consulta y auditoría de procesos; sin edición administrativa."
      />
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply} />
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable
          headers={['Candidato', 'Vacante', 'Empresa', 'Compatibilidad', 'Estado', 'Auditoría']}
        >
          {state.query.data.items.map((item) => (
            <tr key={item.id}>
              <Cell>
                {[item.candidate.firstName, item.candidate.lastName].filter(Boolean).join(' ') ||
                  item.candidate.user.email}
              </Cell>
              <Cell>{item.vacancy.title}</Cell>
              <Cell>{item.company.name ?? 'Sin nombre'}</Cell>
              <Cell>
                <strong className="text-primary">{item.compatibilityScore}%</strong>
              </Cell>
              <Cell>
                <StatusBadge>{item.status}</StatusBadge>
              </Cell>
              <Cell>
                <Button size="sm" variant="ghost" onClick={() => setSelected(item)}>
                  Ver historial
                </Button>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
      <Dialog
        open={Boolean(selected)}
        title="Historial de postulación"
        onClose={() => setSelected(undefined)}
      >
        {selected?.statusHistory.map((event) => (
          <div key={event.id} className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
            <strong>{event.toStatus}</strong>
            <p className="text-xs text-slate-500">
              {new Date(event.changedAt).toLocaleString('es-CO')}
            </p>
          </div>
        ))}
      </Dialog>
    </>
  );
}
function SkillsSection({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const [type, setType] = useState('');
  const state = usePaged<AdminSkill>('admin-skills', `/admin/skills${type ? `?type=${type}` : ''}`);
  const client = useQueryClient();
  const [editing, setEditing] = useState<AdminSkill>();
  const [form, setForm] = useState({
    name: '',
    category: '',
    type: 'TECHNICAL' as 'TECHNICAL' | 'SOFT',
    active: true,
  });
  const save = useMutation({
    mutationFn: () =>
      apiFetch(editing ? `/admin/skills/${editing.id}` : '/admin/skills', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-skills'] });
      setEditing(undefined);
      setForm({ name: '', category: '', type: 'TECHNICAL', active: true });
      notify('Catálogo de habilidades actualizado');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const toggle = useMutation({
    mutationFn: (item: AdminSkill) =>
      apiFetch(`/admin/skills/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-skills'] }),
  });
  return (
    <>
      <Heading
        section="Habilidades"
        title="Catálogo global"
        description="Administra nombres, categorías y tipo técnico o blando."
      />
      <div className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 lg:grid-cols-[1fr_1fr_180px_auto]">
        <Input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Categoría"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <select
          className="rounded-xl border px-3 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as 'TECHNICAL' | 'SOFT' })}
        >
          <option value="TECHNICAL">Técnica</option>
          <option value="SOFT">Blanda</option>
        </select>
        <Button
          disabled={save.isPending || form.name.length < 2 || form.category.length < 2}
          onClick={() => save.mutate()}
        >
          {editing ? 'Guardar cambios' : 'Crear habilidad'}
        </Button>
      </div>
      <SearchBar value={state.search} onChange={state.setSearch} onSubmit={state.apply}>
        <select
          className="rounded-xl border px-3 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="TECHNICAL">Técnicas</option>
          <option value="SOFT">Blandas</option>
        </select>
      </SearchBar>
      <TableState
        loading={state.query.isLoading}
        error={state.query.isError}
        empty={state.query.data?.items.length === 0}
      />
      {state.query.data?.items.length ? (
        <AdminTable headers={['Nombre', 'Categoría', 'Tipo', 'Estado', 'Acciones']}>
          {state.query.data.items.map((item) => (
            <tr key={item.id}>
              <Cell>
                <strong>{item.name}</strong>
              </Cell>
              <Cell>{item.category}</Cell>
              <Cell>
                <StatusBadge tone="primary">{item.type}</StatusBadge>
              </Cell>
              <Cell>{item.active ? 'Activa' : 'Inactiva'}</Cell>
              <Cell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(item);
                      setForm({
                        name: item.name,
                        category: item.category,
                        type: item.type,
                        active: item.active,
                      });
                    }}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate(item)}>
                    {item.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </Cell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
      <Pager data={state.query.data} page={state.page} setPage={state.setPage} />
    </>
  );
}
function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}
function Cell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 text-slate-600">{children}</td>;
}
function Detail({ values }: { values: Record<string, string> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {Object.entries(values).map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
          <dd className="mt-1 break-all text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
