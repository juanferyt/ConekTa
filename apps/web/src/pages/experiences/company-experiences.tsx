import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Plus, Rocket, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState, MetricCard, StatusBadge } from '@/components/dashboard-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import type { CatalogSkill } from '../candidate/candidate-types';
import { CompanyHeading, CompanyPanel, CompanyQueryState } from '../company/company-page';
import type { ExperienceApplication, ExperienceOpportunity } from './experience-types';
import { evaluationCriteria, ratingLabels, type EvaluationCriterion } from './evaluation-criteria';

const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(30),
  objective: z.string().min(10),
  activities: z.string().min(2),
  professionalArea: z.string().min(2),
  modality: z.enum(['PRESENCIAL', 'HIBRIDO', 'REMOTO']),
  city: z.string(),
  estimatedDurationWeeks: z.number().min(1).max(52),
  startsAt: z.string(),
  deadline: z.string(),
  participantLimit: z.number().min(1).max(100),
  expectedDeliverables: z.string().min(2),
  skillIds: z.array(z.string()).min(1),
});
type Form = z.infer<typeof schema>;
const initial: Form = {
  title: '',
  description: '',
  objective: '',
  activities: '',
  professionalArea: '',
  modality: 'REMOTO',
  city: '',
  estimatedDurationWeeks: 4,
  startsAt: '',
  deadline: '',
  participantLimit: 1,
  expectedDeliverables: '',
  skillIds: [],
};

export function CompanyExperiencesPage() {
  const qc = useQueryClient(),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState<string>();
  const list = useQuery({
    queryKey: ['company-experiences'],
    queryFn: () => apiFetch<ExperienceOpportunity[]>('/experiences/company'),
  });
  const metrics = useQuery({
    queryKey: ['company-experience-dashboard'],
    queryFn: () =>
      apiFetch<{
        published: number;
        active: number;
        participants: number;
        pendingSubmissions: number;
        completed: number;
      }>('/experiences/company/dashboard'),
  });
  const skills = useQuery({
    queryKey: ['skills'],
    queryFn: () => apiFetch<CatalogSkill[]>('/skills'),
  });
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: initial });
  const create = useMutation({
    mutationFn: (data: Form) =>
      apiFetch('/experiences/company', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          activities: data.activities.split('\n').filter(Boolean),
          expectedDeliverables: data.expectedDeliverables.split('\n').filter(Boolean),
          startsAt: data.startsAt || undefined,
          deadline: data.deadline || undefined,
          city: data.city || undefined,
          skills: data.skillIds.map((skillId) => ({ skillId, priority: 'REQUIRED', weight: 3 })),
        }),
      }),
    onSuccess: () => {
      form.reset(initial);
      setCreating(false);
      void qc.invalidateQueries({ queryKey: ['company-experiences'] });
    },
  });
  const action = useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['company-experiences'] });
      void qc.invalidateQueries({ queryKey: ['company-experience-dashboard'] });
    },
  });
  return (
    <>
      <CompanyHeading
        eyebrow="ConekTa Experiencia"
        title="Experiencias y retos"
        description="Publica proyectos reales y valida el potencial del talento joven."
      />
      {action.isError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
          {action.error.message}
        </p>
      )}
      {action.isSuccess && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">
          Cambio guardado correctamente.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.data && (
          <>
            <MetricCard label="Publicados" value={metrics.data.published} icon={Rocket} />
            <MetricCard label="Activos" value={metrics.data.active} icon={Send} />
            <MetricCard label="Participantes" value={metrics.data.participants} icon={Users} />
            <MetricCard
              label="Entregas pendientes"
              value={metrics.data.pendingSubmissions}
              icon={ClipboardCheck}
            />
            <MetricCard label="Completados" value={metrics.data.completed} icon={CheckCircle2} />
          </>
        )}
      </div>
      <div className="my-7 flex justify-end">
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="mr-2 size-4" />
          Nuevo reto
        </Button>
      </div>
      {creating && (
        <CompanyPanel className="mb-7">
          <h2 className="mb-5 text-xl font-bold">Nueva experiencia práctica</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((data) => create.mutate(data))}
          >
            <Input placeholder="Título" {...form.register('title')} />
            <Input placeholder="Área profesional" {...form.register('professionalArea')} />
            <textarea
              className="min-h-28 rounded-xl border p-3 md:col-span-2"
              placeholder="Descripción"
              {...form.register('description')}
            />
            <textarea
              className="min-h-24 rounded-xl border p-3 md:col-span-2"
              placeholder="Objetivo"
              {...form.register('objective')}
            />
            <textarea
              className="min-h-24 rounded-xl border p-3"
              placeholder="Actividades, una por línea"
              {...form.register('activities')}
            />
            <textarea
              className="min-h-24 rounded-xl border p-3"
              placeholder="Entregables, uno por línea"
              {...form.register('expectedDeliverables')}
            />
            <select className="h-12 rounded-xl border px-3" {...form.register('modality')}>
              <option value="REMOTO">Remoto</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="PRESENCIAL">Presencial</option>
            </select>
            <Input placeholder="Ciudad" {...form.register('city')} />
            <Input
              type="number"
              placeholder="Duración en semanas"
              {...form.register('estimatedDurationWeeks', { valueAsNumber: true })}
            />
            <Input
              type="number"
              placeholder="Participantes"
              {...form.register('participantLimit', { valueAsNumber: true })}
            />
            <Input type="date" {...form.register('deadline')} />
            <Input type="date" {...form.register('startsAt')} />
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Habilidades requeridas</p>
              <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {skills.data?.map((skill) => (
                  <label className="flex items-center gap-2 text-sm" key={skill.id}>
                    <input type="checkbox" value={skill.id} {...form.register('skillIds')} />
                    {skill.name}
                  </label>
                ))}
              </div>
            </div>
            {Object.keys(form.formState.errors).length > 0 && (
              <p className="text-sm text-red-600 md:col-span-2">
                Revisa los campos y selecciona al menos una habilidad.
              </p>
            )}
            <Button className="md:col-span-2" disabled={create.isPending}>
              Guardar borrador
            </Button>
          </form>
        </CompanyPanel>
      )}
      <CompanyQueryState loading={list.isLoading} error={list.isError} />
      <div className="space-y-5">
        {list.data?.map((item) => (
          <CompanyPanel key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                className="text-left"
                onClick={() => setSelected(selected === item.id ? undefined : item.id)}
              >
                <h2 className="text-xl font-bold">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.professionalArea} · {item.estimatedDurationWeeks} semanas ·{' '}
                  {item._count.applications} postulaciones
                </p>
              </button>
              <div className="flex gap-2">
                <StatusBadge>{item.status}</StatusBadge>
                {item.status === 'DRAFT' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        action.mutate({ path: `/experiences/company/${item.id}`, method: 'DELETE' })
                      }
                    >
                      Eliminar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        action.mutate({ path: `/experiences/company/${item.id}/publish` })
                      }
                    >
                      Publicar
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.skills.map((s) => (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs" key={s.skillId}>
                  {s.skill.name}
                </span>
              ))}
            </div>
            {selected === item.id && (
              <div className="mt-6 space-y-4 border-t pt-5">
                {item.applications?.map((app) => (
                  <Applicant
                    key={app.id}
                    app={app}
                    skills={item.skills.map((s) => s.skill)}
                    action={action.mutate}
                    pending={action.isPending}
                  />
                ))}
                {!item.applications?.length && (
                  <p className="text-sm text-slate-500">Aún no hay postulaciones.</p>
                )}
              </div>
            )}
          </CompanyPanel>
        ))}
      </div>
      {list.data?.length === 0 && (
        <EmptyState
          title="No has publicado experiencias"
          description="Crea el primer reto práctico para encontrar talento por sus capacidades."
        />
      )}
    </>
  );
}

function Applicant({
  app,
  skills,
  action,
  pending,
}: {
  app: ExperienceApplication;
  skills: CatalogSkill[];
  action: (value: { path: string; method?: string; body?: unknown }) => void;
  pending: boolean;
}) {
  const [evaluating, setEvaluating] = useState(false);
  const [verified, setVerified] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Partial<Record<EvaluationCriterion, number>>>({});
  const validScores = evaluationCriteria.every(
    ([key]) => Number.isInteger(scores[key]) && scores[key]! >= 1 && scores[key]! <= 5,
  );
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="font-semibold">
            {app.candidate?.firstName} {app.candidate?.lastName}
          </p>
          <p className="text-sm text-slate-500">
            {app.candidate?.headline || 'Perfil profesional'} · {app.compatibilityScore}% compatible
          </p>
        </div>
        <StatusBadge>{app.status}</StatusBadge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {app.status === 'APPLIED' && (
          <>
            <Button
              size="sm"
              onClick={() =>
                action({
                  path: `/experiences/company/applications/${app.id}/status`,
                  method: 'PATCH',
                  body: { status: 'ACCEPTED' },
                })
              }
            >
              Aceptar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                action({
                  path: `/experiences/company/applications/${app.id}/status`,
                  method: 'PATCH',
                  body: { status: 'REJECTED' },
                })
              }
            >
              Rechazar
            </Button>
          </>
        )}
        {app.status === 'ACCEPTED' && (
          <Button
            size="sm"
            onClick={() =>
              action({
                path: `/experiences/company/applications/${app.id}/status`,
                method: 'PATCH',
                body: { status: 'IN_PROGRESS' },
              })
            }
          >
            Iniciar experiencia
          </Button>
        )}
        {app.status === 'SUBMITTED' && (
          <Button
            size="sm"
            onClick={() => {
              setScores(
                app.evaluation
                  ? Object.fromEntries(
                      evaluationCriteria.map(([key]) => [key, app.evaluation![key]]),
                    )
                  : {},
              );
              setComment(app.evaluation?.companyComment ?? '');
              setVerified(app.evaluation?.verifiedSkillIds ?? []);
              setEvaluating(true);
            }}
          >
            {app.evaluation ? 'Revisar evaluación' : 'Evaluar entrega'}
          </Button>
        )}
        {app.status === 'SUBMITTED' && app.evaluation && (
          <Button
            size="sm"
            onClick={() => action({ path: `/experiences/company/applications/${app.id}/complete` })}
          >
            Completar y emitir certificado
          </Button>
        )}
      </div>
      {app.submission && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p>{app.submission.workDescription}</p>
          <a
            className="text-primary font-semibold"
            href={app.submission.projectUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir entrega
          </a>
        </div>
      )}
      {app.evaluation && !evaluating && (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {evaluationCriteria.map(([key, label]) => (
            <div key={key}>
              <dt className="text-slate-500">{label}</dt>
              <dd>{app.evaluation![key]} / 5</dd>
            </div>
          ))}
        </dl>
      )}
      {app.verifiedExperience?.certificate && (
        <a
          className="text-primary mt-4 block underline"
          href={`/verify/${app.verifiedExperience.certificate.code}`}
        >
          Consultar certificado y estado actual
        </a>
      )}
      {evaluating && app.status === 'SUBMITTED' && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-4 text-sm text-slate-600">
            Califica cada criterio según la entrega revisada. Selecciona únicamente las competencias
            que hayas podido comprobar. La emisión requiere una empresa verificada por
            administración.
          </p>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            {evaluationCriteria.map(([key, label]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <select
                  required
                  className="mt-1 block w-full rounded-lg border bg-white p-2"
                  value={scores[key] ?? ''}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      [key]: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                >
                  <option value="">Selecciona una calificación</option>
                  {ratingLabels.map((text, index) => (
                    <option key={index} value={index + 1}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="mb-2 text-sm font-semibold">Competencias verificadas</p>
          <div className="flex flex-wrap gap-3">
            {skills.map((skill) => (
              <label key={skill.id} className="text-sm">
                <input
                  className="mr-2"
                  type="checkbox"
                  checked={verified.includes(skill.id)}
                  onChange={(e) =>
                    setVerified(
                      e.target.checked
                        ? [...verified, skill.id]
                        : verified.filter((id) => id !== skill.id),
                    )
                  }
                />
                {skill.name}
              </label>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario de evaluación"
          />
          <Button
            className="mt-3"
            disabled={
              pending || !validScores || comment.trim().length < 10 || comment.length > 2000
            }
            onClick={() =>
              action({
                path: `/experiences/company/applications/${app.id}/evaluation`,
                body: {
                  ...scores,
                  companyComment: comment.trim(),
                  verifiedSkillIds: verified,
                },
              })
            }
          >
            Guardar evaluación
          </Button>
          <Button className="ml-2" variant="outline" onClick={() => setEvaluating(false)}>
            Cerrar evaluación
          </Button>
        </div>
      )}
    </div>
  );
}
