import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BriefcaseBusiness, CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CompatibilityBadge } from '@/components/compatibility-card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type {
  ApplicationHistory,
  ApplicationStatus,
  MatchedVacancy,
} from '../company/company-types';
import { Panel, QueryState, SectionHeading } from './candidate-page';

interface CandidateApplication {
  id: string;
  status: ApplicationStatus;
  compatibilityScore: number;
  createdAt: string;
  offerSalary?: number;
  offerCurrency: string;
  offeredStartDate?: string;
  offerNotes?: string;
  vacancy: MatchedVacancy & { company: { id: string; name?: string; logoUrl?: string } };
  statusHistory: ApplicationHistory[];
}
const statusLabel: Record<ApplicationStatus, string> = {
  APPLIED: 'Postulado',
  UNDER_REVIEW: 'En revisión',
  INTERVIEW: 'Entrevista',
  SELECTED: 'Seleccionado',
  OFFER_SENT: 'Oferta recibida',
  OFFER_ACCEPTED: 'Oferta aceptada',
  OFFER_DECLINED: 'Oferta rechazada',
  HIRED: 'Contratado',
  CANCELLED: 'Proceso cancelado',
  REJECTED: 'No seleccionado',
  WITHDRAWN: 'Retirada',
};

export function CandidateOpportunities({ type }: { type: 'opportunities' | 'applications' }) {
  return type === 'applications' ? <CandidateApplications /> : <RecommendedOpportunities />;
}

function RecommendedOpportunities() {
  const query = useQuery({
    queryKey: ['candidate-recommendations'],
    queryFn: () => apiFetch<MatchedVacancy[]>('/candidate/recommendations'),
  });
  if (query.isLoading || query.isError)
    return (
      <>
        <SectionHeading
          eyebrow="Conecta"
          title="Oportunidades"
          description="Vacantes ordenadas según tu compatibilidad real."
        />
        <QueryState loading={query.isLoading} error={query.isError} />
      </>
    );
  return (
    <>
      <SectionHeading
        eyebrow="Conecta"
        title="Oportunidades para ti"
        description="Recomendaciones calculadas con tus habilidades, formación, proyectos y disponibilidad."
      />
      {!query.data!.length && <Empty text="No hay oportunidades publicadas por el momento." />}
      <div className="grid gap-4 md:grid-cols-2">
        {query.data!.map((vacancy) => (
          <Link key={vacancy.id} to={`/opportunities/${vacancy.id}`}>
            <Panel className="hover:border-primary/40 h-full transition">
              <CompatibilityBadge score={vacancy.compatibility.score} />
              <h2 className="mt-4 text-lg font-semibold">{vacancy.title}</h2>
              <p className="text-primary mt-1 text-sm">
                {vacancy.company.name ?? 'Empresa por completar'}
              </p>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                {vacancy.description}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="size-4" />
                {vacancy.city} · {vacancy.modality}
              </p>
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}

function CandidateApplications() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: () => apiFetch<CandidateApplication[]>('/candidate/applications'),
  });
  const withdraw = useMutation({
    mutationFn: (vacancyId: string) =>
      apiFetch(`/candidate/applications/${vacancyId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['candidate-applications'] }),
  });
  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'OFFER_ACCEPTED' | 'OFFER_DECLINED' }) => apiFetch(`/candidate/applications/${id}/offer-response`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['candidate-applications'] }),
  });
  if (query.isLoading || query.isError)
    return (
      <>
        <SectionHeading
          eyebrow="Proceso"
          title="Mis postulaciones"
          description="Consulta el avance real de tus procesos de selección."
        />
        <QueryState loading={query.isLoading} error={query.isError} />
      </>
    );
  return (
    <>
      <SectionHeading
        eyebrow="Proceso"
        title="Mis postulaciones"
        description="Consulta empresa, compatibilidad y trazabilidad de cada proceso."
      />
      {!query.data!.length && <Empty text="Aún no te has postulado a ninguna oportunidad." />}
      <div className="space-y-5">
        {query.data!.map((application) => {
          const canWithdraw = ['APPLIED', 'UNDER_REVIEW', 'INTERVIEW'].includes(application.status);
          return (
            <Panel key={application.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">{application.vacancy.title}</h2>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="text-primary mt-1 text-sm">
                    {application.vacancy.company.name ?? 'Empresa por completar'}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays className="size-4" />
                    Postulación: {new Date(application.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <CompatibilityBadge score={application.compatibilityScore} />
              </div>
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-sm font-semibold">Línea de tiempo</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  {application.statusHistory.map((event, index) => (
                    <div key={event.id} className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="bg-primary mt-1.5 size-2.5 shrink-0 rounded-full" />
                      <div>
                        <p className="text-xs font-medium">{statusLabel[event.toStatus]}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(event.changedAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                      {index < application.statusHistory.length - 1 && (
                        <span className="ml-auto hidden h-px flex-1 bg-slate-200 sm:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {application.offerSalary && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Oferta: {new Intl.NumberFormat('es-CO',{style:'currency',currency:application.offerCurrency??'COP',maximumFractionDigits:0}).format(application.offerSalary)}</strong>{application.offeredStartDate&&<p className="mt-1">Fecha propuesta de inicio: {new Date(application.offeredStartDate).toLocaleDateString('es-CO')}</p>}{application.offerNotes&&<p className="mt-2">{application.offerNotes}</p>}{application.status==='OFFER_SENT'&&<div className="mt-4 flex gap-2"><Button size="sm" onClick={()=>respond.mutate({id:application.id,status:'OFFER_ACCEPTED'})}>Aceptar oferta</Button><Button size="sm" variant="outline" onClick={()=>{if(window.confirm('¿Deseas rechazar esta oferta?'))respond.mutate({id:application.id,status:'OFFER_DECLINED'})}}>Rechazar</Button></div>}</div>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to={`/opportunities/${application.vacancy.id}`}>Ver vacante</Link>
                </Button>
                {canWithdraw && (
                  <Button
                    variant="ghost"
                    disabled={withdraw.isPending}
                    onClick={() => {
                      if (window.confirm('¿Confirmas que deseas retirar esta postulación?'))
                        withdraw.mutate(application.vacancy.id);
                    }}
                  >
                    Retirar postulación
                  </Button>
                )}
              </div>
              {withdraw.isError && (
                <p className="mt-3 text-sm text-red-600">{withdraw.error.message}</p>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone =
    ['SELECTED', 'OFFER_ACCEPTED', 'HIRED'].includes(status)
      ? 'bg-emerald-100 text-emerald-700'
      : ['REJECTED', 'WITHDRAWN', 'OFFER_DECLINED', 'CANCELLED'].includes(status)
        ? 'bg-slate-200 text-slate-600'
        : status === 'INTERVIEW'
          ? 'bg-violet-100 text-violet-700'
          : 'bg-amber-100 text-amber-700';
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {statusLabel[status]}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <Panel>
      <BriefcaseBusiness className="text-primary size-8" />
      <h2 className="mt-4 font-semibold">Sin registros</h2>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </Panel>
  );
}
