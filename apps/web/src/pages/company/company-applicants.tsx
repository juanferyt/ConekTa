import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FolderKanban, GraduationCap, UserRoundSearch } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { CompanyHeading, CompanyPanel, CompanyQueryState } from './company-page';
import type { ApplicationStatus, CompanyApplication, Vacancy } from './company-types';

const labels: Record<ApplicationStatus, string> = {
  APPLIED: 'Postulado',
  UNDER_REVIEW: 'En revisión',
  INTERVIEW: 'Entrevista',
  SELECTED: 'Seleccionado',
  OFFER_SENT: 'Oferta enviada',
  OFFER_ACCEPTED: 'Oferta aceptada',
  OFFER_DECLINED: 'Oferta rechazada',
  HIRED: 'Contratado',
  CANCELLED: 'Proceso cancelado',
  REJECTED: 'No seleccionado',
  WITHDRAWN: 'Retirada',
};
const actions: Partial<Record<ApplicationStatus, { label: string; status: ApplicationStatus }[]>> =
  {
    APPLIED: [
      { label: 'Pasar a revisión', status: 'UNDER_REVIEW' },
      { label: 'No seleccionar', status: 'REJECTED' },
    ],
    UNDER_REVIEW: [
      { label: 'Invitar a entrevista', status: 'INTERVIEW' },
      { label: 'No seleccionar', status: 'REJECTED' },
    ],
    INTERVIEW: [
      { label: 'Seleccionar', status: 'SELECTED' },
      { label: 'No seleccionar', status: 'REJECTED' },
    ],
    OFFER_ACCEPTED: [
      { label: 'Confirmar contratación', status: 'HIRED' },
      { label: 'Cancelar proceso', status: 'CANCELLED' },
    ],
    OFFER_SENT: [{ label: 'Cancelar oferta', status: 'CANCELLED' }],
  };

export function CompanyApplicants({ candidatesOnly = false }: { candidatesOnly?: boolean }) {
  const client = useQueryClient();
  const [params] = useSearchParams();
  const [sort, setSort] = useState('date');
  const [vacancyId, setVacancyId] = useState(params.get('vacancyId') ?? '');
  const [expanded, setExpanded] = useState<string>();
  const [offerFor, setOfferFor] = useState<CompanyApplication>();
  const [offerForm, setOfferForm] = useState({ salary: '', startDate: '', expiresAt: '', benefits: '', notes: '' });
  const query = useQuery({
    queryKey: ['company-applications', sort, vacancyId],
    queryFn: () =>
      apiFetch<CompanyApplication[]>(
        `/company/applications?sort=${sort}${vacancyId ? `&vacancyId=${vacancyId}` : ''}`,
      ),
  });
  const vacancies = useQuery({
    queryKey: ['company-vacancies'],
    queryFn: () => apiFetch<Vacancy[]>('/company/vacancies'),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      apiFetch(`/company/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      setOfferFor(undefined);
      setOfferForm({ salary: '', startDate: '', expiresAt: '', benefits: '', notes: '' });
      void client.invalidateQueries({ queryKey: ['company-applications'] });
      void client.invalidateQueries({ queryKey: ['company-dashboard'] });
    },
  });
  const offer = useMutation({
    mutationFn: ({
      id,
      salary,
      startDate,
      notes,
    }: {
      id: string;
      salary: number;
      startDate: string;
      notes?: string;
    }) =>
      apiFetch(`/company/applications/${id}/offer`, {
        method: 'POST',
        body: JSON.stringify({ salary, currency: 'COP', startDate, notes }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['company-applications'] });
      void client.invalidateQueries({ queryKey: ['company-dashboard'] });
    },
  });
  if (query.isLoading || query.isError)
    return (
      <>
        <CompanyHeading
          eyebrow="Selección"
          title={candidatesOnly ? 'Candidatos' : 'Postulaciones'}
          description="Personas que se han postulado a tus vacantes."
        />
        <CompanyQueryState loading={query.isLoading} error={query.isError} />
      </>
    );
  const items = candidatesOnly
    ? Array.from(new Map(query.data!.map((item) => [item.candidate.id, item])).values())
    : query.data!;
  return (
    <>
      <CompanyHeading
        eyebrow="Selección"
        title={candidatesOnly ? 'Candidatos' : 'Postulaciones'}
        description={
          candidatesOnly
            ? 'Talento interesado en tus oportunidades.'
            : 'Gestiona el proceso con trazabilidad completa.'
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <select
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="date">Más recientes</option>
          <option value="compatibility">Mayor compatibilidad</option>
          <option value="name">Nombre</option>
        </select>
        <select
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          value={vacancyId}
          onChange={(event) => setVacancyId(event.target.value)}
        >
          <option value="">Todas las vacantes</option>
          {vacancies.data?.map((vacancy) => (
            <option key={vacancy.id} value={vacancy.id}>
              {vacancy.title}
            </option>
          ))}
        </select>
      </div>
      {!items.length && (
        <CompanyPanel>
          <UserRoundSearch className="text-primary size-7" />
          <h2 className="mt-4 font-semibold">
            Aún no hay {candidatesOnly ? 'candidatos' : 'postulaciones'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Aparecerán cuando una vacante publicada reciba postulaciones.
          </p>
        </CompanyPanel>
      )}
      <div className="space-y-4">
        {items.map((item) => {
          const open = expanded === item.id;
          const name =
            [item.candidate.firstName, item.candidate.lastName].filter(Boolean).join(' ') ||
            'Perfil por completar';
          return (
            <CompanyPanel key={item.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold">{name}</h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.candidate.headline ?? item.candidate.city ?? 'Sin titular profesional'}
                  </p>
                  <p className="text-primary mt-2 text-sm">{item.vacancy.title}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Postulación: {new Date(item.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <strong className="text-primary text-3xl">{item.compatibilityScore}%</strong>
                  <p className="text-xs text-slate-500">compatibilidad al postularse</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.candidate.skills.slice(0, 6).map((skill) => (
                  <span
                    key={skill.skill.id}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                  >
                    {skill.skill.name}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.status === 'SELECTED' && (
                  <Button size="sm" onClick={() => setOfferFor(item)}>
                    Enviar oferta laboral
                  </Button>
                )}
                {actions[item.status]?.map((action) => (
                  <Button
                    key={action.status}
                    size="sm"
                    variant={action.status === 'REJECTED' ? 'outline' : 'default'}
                    disabled={update.isPending}
                    onClick={() => {
                      if (
                        action.status !== 'REJECTED' ||
                        window.confirm('¿Confirmas que este candidato no continuará en el proceso?')
                      )
                        update.mutate({ id: item.id, status: action.status });
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(open ? undefined : item.id)}
                >
                  {open ? (
                    <ChevronUp className="mr-2 size-4" />
                  ) : (
                    <ChevronDown className="mr-2 size-4" />
                  )}
                  {open ? 'Cerrar perfil' : 'Abrir perfil profesional'}
                </Button>
              </div>
              {update.isError && (
                <p className="mt-3 text-sm text-red-600">{update.error.message}</p>
              )}
              {item.offerSalary && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <strong>
                    Oferta:{' '}
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: item.offerCurrency ?? 'COP',
                      maximumFractionDigits: 0,
                    }).format(item.offerSalary)}
                  </strong>
                  {item.offeredStartDate && (
                    <p className="mt-1">
                      Inicio propuesto:{' '}
                      {new Date(item.offeredStartDate).toLocaleDateString('es-CO')}
                    </p>
                  )}
                  {item.offerNotes && <p className="mt-1">{item.offerNotes}</p>}
                </div>
              )}
              {open && (
                <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-2">
                  <ProfileBlock icon={GraduationCap} title="Formación">
                    {item.candidate.educations.length ? (
                      item.candidate.educations.map((education) => (
                        <p key={education.id} className="text-sm">
                          <strong>{education.program}</strong>
                          <br />
                          <span className="text-slate-500">
                            {education.institution} · {education.status}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Sin formación registrada.</p>
                    )}
                  </ProfileBlock>
                  <ProfileBlock icon={FolderKanban} title="Proyectos">
                    {item.candidate.projects.length ? (
                      item.candidate.projects.map((project) => (
                        <div key={project.id}>
                          <p className="text-sm font-semibold">{project.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {project.description}
                          </p>
                          <p className="text-primary mt-1 text-xs">
                            {project.technologies.join(' · ')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Sin proyectos registrados.</p>
                    )}
                  </ProfileBlock>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold">Experiencias prácticas verificadas</p>
                    {item.candidate.verifiedExperiences?.length ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {item.candidate.verifiedExperiences.map((experience) => (
                          <div key={experience.id} className="rounded-xl bg-emerald-50 p-4">
                            <p className="font-semibold text-emerald-900">{experience.title}</p>
                            <p className="text-xs text-emerald-700">
                              {experience.companyName} · {experience.durationWeeks} semanas
                            </p>
                            <p className="mt-2 text-xs text-emerald-800">
                              {experience.skills.map(({ skill }) => skill.name).join(' · ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Sin experiencias verificadas públicas.
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold">Historial del proceso</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.statusHistory.map((history) => (
                        <span
                          key={history.id}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-xs"
                        >
                          {labels[history.toStatus]} ·{' '}
                          {new Date(history.changedAt).toLocaleString('es-CO')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CompanyPanel>
          );
        })}
      </div>
      {offerFor && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><form className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onSubmit={event=>{event.preventDefault();const salary=Number(offerForm.salary);if(salary>0&&offerForm.startDate)offer.mutate({id:offerFor.id,salary,startDate:offerForm.startDate,notes:[offerForm.notes,offerForm.benefits&&`Beneficios:\n${offerForm.benefits}`,offerForm.expiresAt&&`Oferta válida hasta: ${offerForm.expiresAt}`].filter(Boolean).join('\n\n')})}}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Oferta laboral</p><h2 className="mt-1 text-2xl font-bold">{offerFor.candidate.firstName} · {offerFor.vacancy.title}</h2></div><Button type="button" variant="ghost" onClick={()=>setOfferFor(undefined)}>Cerrar</Button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Salario mensual (COP)<input required type="number" min="1" value={offerForm.salary} onChange={e=>setOfferForm({...offerForm,salary:e.target.value})} className="mt-2 h-11 w-full rounded-xl border px-3" /></label><label className="text-sm font-medium">Fecha de inicio<input required type="date" value={offerForm.startDate} onChange={e=>setOfferForm({...offerForm,startDate:e.target.value})} className="mt-2 h-11 w-full rounded-xl border px-3" /></label><label className="text-sm font-medium">Vigencia de la oferta<input type="date" value={offerForm.expiresAt} onChange={e=>setOfferForm({...offerForm,expiresAt:e.target.value})} className="mt-2 h-11 w-full rounded-xl border px-3" /></label><label className="text-sm font-medium">Beneficios<input value={offerForm.benefits} onChange={e=>setOfferForm({...offerForm,benefits:e.target.value})} placeholder="Auxilios, bonos, trabajo remoto…" className="mt-2 h-11 w-full rounded-xl border px-3" /></label><label className="text-sm font-medium sm:col-span-2">Condiciones y observaciones<textarea value={offerForm.notes} onChange={e=>setOfferForm({...offerForm,notes:e.target.value})} className="mt-2 min-h-28 w-full rounded-xl border p-3" /></label></div><div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Vista previa: </span><strong>{offerForm.salary?new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(offerForm.salary)):'Define el salario'}</strong></div><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>setOfferFor(undefined)}>Cancelar</Button><Button disabled={offer.isPending}>{offer.isPending?'Enviando…':'Confirmar y enviar oferta'}</Button></div></form></div>}
    </>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone = ['SELECTED', 'OFFER_ACCEPTED', 'HIRED'].includes(status)
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'REJECTED' || status === 'WITHDRAWN'
      ? 'bg-slate-200 text-slate-600'
      : status === 'INTERVIEW'
        ? 'bg-violet-100 text-violet-700'
        : 'bg-amber-100 text-amber-700';
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{labels[status]}</span>
  );
}
function ProfileBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="text-primary size-4" />
        {title}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
