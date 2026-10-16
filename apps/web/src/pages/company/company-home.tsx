import { useQuery } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  CircleCheck,
  FileText,
  Inbox,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs,
  EmptyState,
  MetricCard,
  Progress,
  SkeletonGrid,
  StatusBadge,
} from '@/components/dashboard-kit';
import { apiFetch } from '@/lib/api-client';
import { CompanyHeading } from './company-page';
import type { CompanyDashboard } from './company-types';
import type { OpportunityIndex } from '../talent/talent-types';

export function CompanyHome() {
  const query = useQuery({
    queryKey: ['company-dashboard'],
    queryFn: () => apiFetch<CompanyDashboard>('/company/dashboard'),
  });
  const opportunityIndex = useQuery({
    queryKey: ['company-opportunity-index'],
    queryFn: () => apiFetch<OpportunityIndex>('/talent/company/opportunity-index'),
  });
  if (query.isLoading)
    return (
      <>
        <CompanyHeading
          eyebrow="Resumen"
          title="Panel empresarial"
          description="Estamos preparando tus métricas reales."
        />
        <SkeletonGrid />
      </>
    );
  if (query.isError)
    return (
      <EmptyState
        title="No pudimos cargar el dashboard"
        description="Comprueba la conexión e intenta nuevamente."
      />
    );
  const { company, metrics, topCandidatesByVacancy } = query.data!;
  const cards = [
    { label: 'Vacantes activas', value: metrics.active, icon: BriefcaseBusiness },
    { label: 'Vacantes cerradas', value: metrics.closed, icon: CircleCheck },
    { label: 'Postulaciones totales', value: metrics.applications, icon: FileText },
    { label: 'Nuevas postulaciones', value: metrics.newApplications, icon: Inbox },
    { label: 'En entrevista', value: metrics.interviews, icon: UsersRound },
    { label: 'Seleccionados', value: metrics.selected, icon: UserRoundCheck },
  ];
  return (
    <>
      <Breadcrumbs items={[{ label: 'Empresa' }, { label: 'Resumen' }]} />
      <CompanyHeading
        eyebrow="Tu equipo empieza aquí"
        title={company.name ?? 'Completa el perfil de tu empresa'}
        description="Tu talento merece una primera oportunidad. Gestiona oportunidades y procesos con información real."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>
      {opportunityIndex.data && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-wider">
                Índice de Primera Oportunidad
              </p>
              <h2 className="mt-2 text-2xl font-bold">Cómo acompaña tu empresa al talento joven</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                {opportunityIndex.data.explanation} Confianza: {opportunityIndex.data.confidence}.
              </p>
            </div>
            <strong className="text-primary text-5xl">{opportunityIndex.data.score}</strong>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Respuesta', opportunityIndex.data.responseRate],
              ['Procesos cerrados', opportunityIndex.data.processCompletionRate],
              ['Retroalimentación', opportunityIndex.data.feedbackRate],
              ['Enfoque junior', opportunityIndex.data.juniorFriendlyRate],
              ['Selección', opportunityIndex.data.selectionRate],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <Progress value={Number(value)} />
              </div>
            ))}
          </div>
        </section>
      )}
      {!company.name && (
        <div className="mt-6">
          <EmptyState
            title="Completa la presentación de tu empresa"
            description="Agrega nombre, sector, ubicación y contacto antes de publicar."
            action={
              <Link to="/company/profile" className="text-primary text-sm font-semibold">
                Completar perfil →
              </Link>
            }
          />
        </div>
      )}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-bold uppercase tracking-[.14em]">
              Selección basada en potencial
            </p>
            <h2 className="mt-2 text-2xl font-bold">Candidatos con mayor compatibilidad</h2>
          </div>
          <Link to="/company/applications" className="text-primary text-sm font-semibold">
            Gestionar procesos →
          </Link>
        </div>
        {!topCandidatesByVacancy.length ? (
          <div className="mt-5">
            <EmptyState
              title="Aún no hay candidatos"
              description="Los rankings aparecerán cuando tus vacantes reciban postulaciones."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {topCandidatesByVacancy.map((group) => (
              <article
                key={group.vacancy.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-primary text-xs font-semibold uppercase tracking-wide">
                      Vacante
                    </p>
                    <h3 className="mt-1 font-bold">{group.vacancy.title}</h3>
                  </div>
                  <Link
                    to={`/company/applications?vacancyId=${group.vacancy.id}`}
                    className="text-primary text-xs font-semibold"
                  >
                    Ver postulaciones
                  </Link>
                </header>
                <div className="divide-y divide-slate-100">
                  {group.candidates.map((application) => (
                    <div
                      key={application.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_160px_120px] sm:items-center"
                    >
                      <div>
                        <p className="font-medium">
                          {[application.candidate.firstName, application.candidate.lastName]
                            .filter(Boolean)
                            .join(' ') || 'Perfil por completar'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {application.candidate.headline ?? 'Sin titular profesional'}
                        </p>
                      </div>
                      <StatusBadge
                        tone={application.status === 'INTERVIEW' ? 'warning' : 'primary'}
                      >
                        {application.status}
                      </StatusBadge>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Match</span>
                          <strong>{application.compatibilityScore}%</strong>
                        </div>
                        <Progress value={application.compatibilityScore} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
