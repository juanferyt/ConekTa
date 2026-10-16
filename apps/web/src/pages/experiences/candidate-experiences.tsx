import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BriefcaseBusiness, CheckCircle2, Clock3, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CompatibilityBadge } from '@/components/compatibility-card';
import { EmptyState, MetricCard, StatusBadge } from '@/components/dashboard-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { Panel, QueryState, SectionHeading } from '../candidate/candidate-page';
import type { CandidateExperiences, ExperienceOpportunity } from './experience-types';

const submissionSchema = z.object({
  workDescription: z.string().min(30),
  projectUrl: z.string().url(),
  githubUrl: z.union([z.literal(''), z.string().url()]),
  additionalLinks: z.string(),
  comments: z.string(),
});
type SubmissionForm = z.infer<typeof submissionSchema>;

export function CandidateExperiencesPage() {
  const qc = useQueryClient(),
    [tab, setTab] = useState<'discover' | 'mine'>('discover'),
    [selected, setSelected] = useState<string>();
  const opportunities = useQuery({
    queryKey: ['experience-opportunities-candidate'],
    queryFn: () => apiFetch<ExperienceOpportunity[]>('/experiences/candidate'),
  });
  const mine = useQuery({
    queryKey: ['candidate-experiences'],
    queryFn: () => apiFetch<CandidateExperiences>('/experiences/candidate/mine'),
  });
  const apply = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/experiences/candidate/${id}/apply`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['candidate-experiences'] });
      setTab('mine');
    },
  });
  const submit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmissionForm }) =>
      apiFetch(`/experiences/candidate/applications/${id}/submission`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          githubUrl: data.githubUrl || undefined,
          additionalLinks: data.additionalLinks
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: () => {
      setSelected(undefined);
      void qc.invalidateQueries({ queryKey: ['candidate-experiences'] });
    },
  });
  const visibility = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiFetch(`/experiences/candidate/verified/${id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ public: isPublic }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['candidate-experiences'] }),
  });
  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      workDescription: '',
      projectUrl: '',
      githubUrl: '',
      additionalLinks: '',
      comments: '',
    },
  });
  return (
    <>
      <SectionHeading
        eyebrow="ConekTa Experiencia"
        title="Construye experiencia"
        description="Demuestra lo que sabes haciendo proyectos reales."
      />
      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === 'discover' ? 'default' : 'outline'}
          onClick={() => setTab('discover')}
        >
          Descubrir retos
        </Button>
        <Button variant={tab === 'mine' ? 'default' : 'outline'} onClick={() => setTab('mine')}>
          Mis experiencias
        </Button>
      </div>
      {tab === 'discover' ? (
        <>
          <QueryState loading={opportunities.isLoading} error={opportunities.isError} />
          <div className="grid gap-5 lg:grid-cols-2">
            {opportunities.data?.map((item) => (
              <Panel key={item.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary text-xs font-bold uppercase tracking-wider">
                      {item.professionalArea}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.company.name} · {item.city || 'Sin ciudad'} · {item.modality}
                    </p>
                  </div>
                  {item.compatibility && <CompatibilityBadge score={item.compatibility.score} />}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.skills.map((s) => (
                    <span key={s.skillId} className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                      {s.skill.name} · {s.priority === 'REQUIRED' ? 'Requerida' : 'Deseable'}
                    </span>
                  ))}
                </div>
                {!!item.developmentSkills?.length && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    Puede ayudarte a fortalecer:{' '}
                    {item.developmentSkills.map((skill) => skill.name).join(', ')} para futuras
                    vacantes.
                  </p>
                )}
                <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    {item.estimatedDurationWeeks} semanas · {item.participantLimit} participante(s)
                  </span>
                  <Button disabled={apply.isPending} onClick={() => apply.mutate(item.id)}>
                    Postularme
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
          {opportunities.data?.length === 0 && (
            <EmptyState
              title="No hay retos publicados"
              description="Las nuevas experiencias compatibles aparecerán aquí."
            />
          )}
          {apply.isError && <p className="mt-4 text-sm text-red-600">{apply.error.message}</p>}
        </>
      ) : (
        <>
          <QueryState loading={mine.isLoading} error={mine.isError} />
          {mine.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Completadas"
                  value={mine.data.stats.completed}
                  icon={CheckCircle2}
                />
                <MetricCard
                  label="Competencias verificadas"
                  value={mine.data.stats.verifiedSkills}
                  icon={Sparkles}
                />
                <MetricCard
                  label="Certificados"
                  value={mine.data.stats.certificates}
                  icon={Award}
                />
                <MetricCard
                  label="Semanas prácticas"
                  value={mine.data.stats.durationWeeks}
                  icon={Clock3}
                />
              </div>
              <div className="mt-7 space-y-5">
                {mine.data.applications.map((app) => (
                  <Panel key={app.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold">{app.experience.title}</h2>
                        <p className="text-sm text-slate-500">
                          {app.experience.company.name} · {app.experience.estimatedDurationWeeks}{' '}
                          semanas
                        </p>
                      </div>
                      <StatusBadge>{app.status}</StatusBadge>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="bg-primary h-full"
                        style={{
                          width: `${['APPLIED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'].indexOf(app.status) * 25}%`,
                        }}
                      />
                    </div>
                    {['ACCEPTED', 'IN_PROGRESS'].includes(app.status) && (
                      <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => setSelected(app.id)}
                      >
                        <Send className="mr-2 size-4" />
                        Registrar entrega
                      </Button>
                    )}
                    {selected === app.id && (
                      <form
                        className="mt-5 grid gap-3 border-t pt-5"
                        onSubmit={form.handleSubmit((data) => submit.mutate({ id: app.id, data }))}
                      >
                        <textarea
                          className="min-h-28 rounded-xl border p-3"
                          placeholder="Descripción del trabajo realizado"
                          {...form.register('workDescription')}
                        />
                        <Input placeholder="URL del proyecto" {...form.register('projectUrl')} />
                        <Input placeholder="GitHub opcional" {...form.register('githubUrl')} />
                        <textarea
                          className="min-h-20 rounded-xl border p-3"
                          placeholder="Enlaces adicionales, uno por línea"
                          {...form.register('additionalLinks')}
                        />
                        <textarea
                          className="min-h-20 rounded-xl border p-3"
                          placeholder="Comentarios"
                          {...form.register('comments')}
                        />
                        <Button disabled={submit.isPending}>Enviar entrega final</Button>
                      </form>
                    )}
                  </Panel>
                ))}
                {mine.data.applications.length === 0 && (
                  <EmptyState
                    title="Aún no tienes experiencias"
                    description="Explora retos y postúlate al que mejor se ajuste a tu perfil."
                  />
                )}
              </div>
              <div className="mt-9">
                <h2 className="mb-4 text-xl font-bold">Experiencias verificadas</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {mine.data.verifiedExperiences.map((item) => (
                    <Panel key={item.id}>
                      <BriefcaseBusiness className="text-primary size-6" />
                      <h3 className="mt-3 font-bold">{item.title}</h3>
                      <p className="text-sm text-slate-500">
                        {item.companyName} · {item.durationWeeks} semanas
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.public
                          ? 'Verificación pública: incluye tu nombre, entrega, enlaces y calificaciones.'
                          : 'Privada: activa la verificación pública para compartir el certificado, tu entrega y sus calificaciones.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.skills.map(({ skill }) => (
                          <span
                            className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                            key={skill.id}
                          >
                            {skill.name}{' '}
                            {item.certificate?.status === 'ACTIVE' && item.certificate.payloadHash
                              ? 'verificada'
                              : '(sin respaldo vigente)'}
                          </span>
                        ))}
                      </div>
                      {item.certificate && (
                        <a
                          className="text-primary mt-4 inline-block text-sm font-semibold"
                          href={`/verify/${item.certificate.code}`}
                        >
                          Ver certificado {item.certificate.code}
                        </a>
                      )}
                      <Button
                        className="ml-3 mt-4"
                        size="sm"
                        variant="outline"
                        onClick={() => visibility.mutate({ id: item.id, isPublic: !item.public })}
                      >
                        {item.public
                          ? 'Ocultar perfil y verificación pública'
                          : 'Hacer pública la experiencia y su evidencia'}
                      </Button>
                    </Panel>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
