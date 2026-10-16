import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompatibilityCard, type MatchResult } from '@/components/compatibility-card';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/use-auth';
import { apiFetch } from '@/lib/api-client';
import type { Vacancy } from './company/company-types';
import type { ImprovementRoute } from './talent/talent-types';

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['public-opportunity', id],
    queryFn: () => apiFetch<Vacancy>(`/opportunities/${id}`),
    enabled: Boolean(id),
  });
  const match = useQuery({
    queryKey: ['candidate-match', id],
    queryFn: () => apiFetch<MatchResult>(`/candidate/matches/${id}`),
    enabled: Boolean(id) && user?.role === 'CANDIDATE',
  });
  const improvement = useQuery({
    queryKey: ['improvement-route', id],
    queryFn: () => apiFetch<ImprovementRoute>(`/talent/candidate/improvement-route/${id}`),
    enabled: Boolean(id) && user?.role === 'CANDIDATE',
  });
  const application = useMutation({
    mutationFn: () => apiFetch(`/candidate/applications/${id}`, { method: 'POST' }),
  });
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <Navbar />
      <main className="container pb-16 pt-28">
        {query.isLoading && <p>Cargando oportunidad…</p>}
        {query.isError && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h1 className="text-xl font-semibold">Esta oportunidad no está disponible</h1>
            <Link className="text-primary mt-4 inline-block" to="/opportunities">
              Volver al listado
            </Link>
          </div>
        )}
        {query.data && (
          <>
            <Link
              className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600"
              to="/opportunities"
            >
              <ArrowLeft className="size-4" />
              Todas las oportunidades
            </Link>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <article className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
                <p className="text-primary text-xs font-bold uppercase tracking-wide">
                  {query.data.opportunityType}
                </p>
                <h1 className="mt-3 text-4xl font-bold">{query.data.title}</h1>
                <p className="mt-2 text-lg text-slate-600">
                  {query.data.company.name ?? 'Empresa por completar'}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {query.data.city} · {query.data.modality}
                  </span>
                  {query.data.deadline && (
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4" />
                      Hasta {query.data.deadline.slice(0, 10)}
                    </span>
                  )}
                </div>
                <Section title="Descripción">
                  <p className="whitespace-pre-line leading-7 text-slate-700">
                    {query.data.description}
                  </p>
                </Section>
                <Section title="Responsabilidades">
                  <List items={query.data.responsibilities} />
                </Section>
                <Section title="Requisitos">
                  <List items={query.data.requirements} />
                </Section>
              </article>
              <aside className="h-fit space-y-5">
                {match.isLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Calculando tu compatibilidad…
                  </div>
                )}
                {match.data && <CompatibilityCard match={match.data} />}
                {improvement.data && improvement.data.steps.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      Ruta para mejorar compatibilidad
                    </p>
                    <p className="mt-2 text-sm text-amber-900">
                      De {improvement.data.current.score}% a un potencial aproximado de{' '}
                      <strong>{improvement.data.targetScore}%</strong>
                    </p>
                    <ol className="mt-4 space-y-3">
                      {improvement.data.steps.map((step) => (
                        <li className="rounded-xl bg-white p-3 text-sm" key={step.skill.id}>
                          <strong>
                            {step.order}. {step.skill.name}
                          </strong>
                          <p className="mt-1 text-xs text-slate-600">{step.guidance}</p>
                          <span className="mt-2 inline-block text-xs font-semibold text-amber-700">
                            Impacto potencial: +{step.potentialGain}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-xs text-amber-700">{improvement.data.disclaimer}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="font-semibold">Información de la oportunidad</h2>
                  <dl className="mt-5 space-y-4 text-sm">
                    <Info label="Contrato" value={query.data.contractType} />
                    <Info label="Ubicación" value={[query.data.city, query.data.department].filter(Boolean).join(', ')} />
                    <Info label="Jornada" value={`${query.data.workSchedule === 'FULL_TIME' ? 'Tiempo completo' : query.data.workSchedule === 'PART_TIME' ? 'Medio tiempo' : 'Flexible'}${query.data.weeklyHours ? ` · ${query.data.weeklyHours} horas semanales` : ''}`} />
                    <Info label="Convenio educativo" value={query.data.requiresUniversityAgreement ? 'Requerido' : 'No requerido'} />
                    <Info
                      label="Experiencia máxima"
                      value={
                        query.data.experienceRequired
                          ? `${query.data.maxExperienceMonths} meses`
                          : 'No requerida'
                      }
                    />
                    <Info label="Modalidad" value={query.data.modality} />
                    {query.data.showSalary && (
                      <Info
                        label="Salario"
                        value={`${query.data.currency} ${query.data.salaryMin ?? '—'} – ${query.data.salaryMax ?? '—'}`}
                      />
                    )}
                  </dl>
                  {query.data.benefits.length > 0 && <div className="mt-6 border-t border-slate-200 pt-5"><p className="text-sm font-medium">Beneficios</p><List items={query.data.benefits} /></div>}
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <p className="text-sm font-medium">Habilidades</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {query.data.skills.map((item) => (
                        <span
                          key={item.skillId}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs"
                        >
                          {item.skill.name} ·{' '}
                          {item.priority === 'REQUIRED' ? 'Requerida' : 'Deseable'}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!user && (
                    <Button asChild className="mt-6 w-full">
                      <Link to="/login">Ingresar para postularme</Link>
                    </Button>
                  )}
                  {user?.role === 'CANDIDATE' && (
                    <>
                      <Button
                        className="mt-6 w-full"
                        disabled={application.isPending || application.isSuccess}
                        onClick={() => application.mutate()}
                      >
                        {application.isPending
                          ? 'Enviando…'
                          : application.isSuccess
                            ? 'Postulación enviada'
                            : 'Postularme'}
                      </Button>
                      {application.isError && (
                        <p className="mt-2 text-xs text-red-600">{application.error.message}</p>
                      )}
                    </>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9 border-t border-slate-200 pt-7">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function List({ items }: { items: string[] }) {
  return items.length ? (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-slate-700">
          <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-slate-500">No especificado.</p>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
