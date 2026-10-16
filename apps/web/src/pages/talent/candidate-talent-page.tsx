import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState, Progress, StatusBadge } from '@/components/dashboard-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL, apiFetch } from '@/lib/api-client';
import type { CandidateDashboard, CatalogSkill } from '../candidate/candidate-types';
import { Panel, QueryState, SectionHeading } from '../candidate/candidate-page';
import type { Contribution, PassportPayload, SkillEvidence } from './talent-types';

const schema = z.object({
  projectId: z.string().uuid(),
  validatorName: z.string().min(2),
  validatorEmail: z.string().email(),
  contributionRole: z.string().min(2),
  contributionSummary: z.string().min(20),
  skillIds: z.array(z.string()).min(1),
});
type Form = z.infer<typeof schema>;
export function CandidateTalentPage() {
  const qc = useQueryClient();
  const evidence = useQuery({
    queryKey: ['skill-evidence'],
    queryFn: () => apiFetch<SkillEvidence[]>('/talent/candidate/evidence'),
  });
  const passport = useQuery({
    queryKey: ['talent-passport'],
    queryFn: () => apiFetch<PassportPayload>('/talent/candidate/passport'),
  });
  const contributions = useQuery({
    queryKey: ['project-contributions'],
    queryFn: () => apiFetch<Contribution[]>('/talent/candidate/contributions'),
  });
  const profile = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => apiFetch<CandidateDashboard>('/candidate/profile'),
  });
  const skills = useQuery({
    queryKey: ['skills'],
    queryFn: () => apiFetch<CatalogSkill[]>('/skills'),
  });
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: '',
      validatorName: '',
      validatorEmail: '',
      contributionRole: '',
      contributionSummary: '',
      skillIds: [],
    },
  });
  const request = useMutation({
    mutationFn: (data: Form) =>
      apiFetch('/talent/candidate/contributions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      form.reset();
      void qc.invalidateQueries({ queryKey: ['project-contributions'] });
    },
  });
  const visibility = useMutation({
    mutationFn: (active: boolean) =>
      apiFetch('/talent/candidate/passport', { method: 'PATCH', body: JSON.stringify({ active }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['talent-passport'] }),
  });
  return (
    <>
      <SectionHeading
        eyebrow="Evidencia de talento"
        title="Skill Proof y Pasaporte ConekTa"
        description="No solo declares lo que sabes: demuestra de dónde viene cada competencia."
      />
      <QueryState
        loading={evidence.isLoading || passport.isLoading}
        error={evidence.isError || passport.isError}
      />
      {passport.data && (
        <Panel className="mb-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-wider">
                Pasaporte profesional portable
              </p>
              <h2 className="mt-2 text-2xl font-bold">{passport.data.passport.publicCode}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Incluye evidencias, proyectos, contribuciones y experiencias verificadas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a
                  href={`/passport/${passport.data.passport.publicCode}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  Abrir pasaporte
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => visibility.mutate(!passport.data.passport.active)}
              >
                {passport.data.passport.active
                  ? 'Desactivar acceso público'
                  : 'Activar acceso público'}
              </Button>
            </div>
          </div>
          <a
            className="text-primary mt-4 inline-block text-xs font-semibold"
            href={`${API_URL}/passport/${passport.data.passport.publicCode}/open-badge`}
          >
            OpenBadgeCredential JSON-LD
          </a>
        </Panel>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {evidence.data?.map((item) => (
          <Panel key={item.skillId}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {item.skill.category}
                </p>
                <h2 className="mt-1 text-xl font-bold">{item.skill.name}</h2>
              </div>
              <strong className="text-primary text-3xl">{item.totalScore}</strong>
            </div>
            <div className="mt-4"><Progress value={item.totalScore} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <span>Declaración {item.declaredScore}/20</span>
              <span>Proyectos {item.projectScore}/25</span>
              <span>Empresa {item.verifiedScore}/40</span>
              <span>Consistencia {item.consistencyScore}/15</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {item.projectCount} proyecto(s) · {item.verifiedCount} validación(es) empresarial(es)
            </p>
          </Panel>
        ))}
        {evidence.data?.length === 0 && (
          <EmptyState
            title="Todavía no hay evidencia calculable"
            description="Agrega habilidades y proyectos para construir tu Skill Proof."
          />
        )}
      </div>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Validación de contribuciones grupales</h2>
        <p className="mt-2 text-sm text-slate-500">
          Solicita a un compañero, docente o responsable que confirme exactamente cuál fue tu
          aporte.
        </p>
        <Panel className="mt-5">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((data) => request.mutate(data))}
          >
            <select className="h-12 rounded-xl border px-3" {...form.register('projectId')}>
              <option value="">Selecciona el proyecto</option>
              {profile.data?.profile.projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <Input placeholder="Nombre del validador" {...form.register('validatorName')} />
            <Input placeholder="Correo del validador" {...form.register('validatorEmail')} />
            <Input placeholder="Tu rol o contribución" {...form.register('contributionRole')} />
            <textarea
              className="min-h-28 rounded-xl border p-3 md:col-span-2"
              placeholder="Describe específicamente qué construiste o aportaste"
              {...form.register('contributionSummary')}
            />
            <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2 md:col-span-2 lg:grid-cols-3">
              {skills.data?.map((skill) => (
                <label className="text-sm" key={skill.id}>
                  <input
                    className="mr-2"
                    type="checkbox"
                    value={skill.id}
                    {...form.register('skillIds')}
                  />
                  {skill.name}
                </label>
              ))}
            </div>
            <Button className="md:col-span-2" disabled={request.isPending}>
              <Send className="mr-2 size-4" />
              Solicitar validación
            </Button>
            {request.isError && <p className="text-sm text-red-600">{request.error.message}</p>}
          </form>
        </Panel>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {contributions.data?.map((item) => (
            <Panel key={item.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.project.title}</h3>
                  <p className="text-sm text-slate-500">
                    {item.validatorName} · {item.contributionRole}
                  </p>
                </div>
                <StatusBadge>{item.status}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.contributionSummary}</p>
            </Panel>
          ))}
        </div>
      </section>
    </>
  );
}
