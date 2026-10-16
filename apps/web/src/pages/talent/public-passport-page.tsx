import { useMutation, useQuery } from '@tanstack/react-query';
import { BadgeCheck, CheckCircle2, ExternalLink, Fingerprint, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { API_URL, apiFetch } from '@/lib/api-client';
import type { PassportPayload } from './talent-types';

export function PublicPassportPage() {
  const { code } = useParams();
  const query = useQuery({
    queryKey: ['public-passport', code],
    queryFn: () => apiFetch<PassportPayload>(`/passport/${code}`),
    enabled: !!code,
  });
  if (query.isLoading)
    return <main className="grid min-h-screen place-items-center">Verificando pasaporte…</main>;
  if (query.isError || !query.data)
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="text-center">
          <ShieldCheck className="mx-auto size-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold">Pasaporte no disponible</h1>
        </div>
      </main>
    );
  const data = query.data;
  return (
    <main className="min-h-screen bg-slate-100 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border bg-white shadow-xl">
        <header className="bg-slate-950 p-8 text-white">
          <BrandLogo className="h-20 w-56 rounded-xl bg-white" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-rose-300">
            Pasaporte ConekTa de talento verificable
          </p>
          <h1 className="mt-3 text-4xl font-bold">{data.candidate.name}</h1>
          <p className="mt-2 text-slate-300">
            {data.candidate.headline} ·{' '}
            {[data.candidate.city, data.candidate.country].filter(Boolean).join(', ')}
          </p>
          <p className="mt-4 font-mono text-xs">{data.passport.publicCode}</p>
        </header>
        <section className="p-7 sm:p-10">
          <h2 className="text-2xl font-bold">Evidencia de habilidades</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.skillEvidence.map((item) => (
              <article className="rounded-2xl border p-5" key={item.skillId}>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold">{item.skill.name}</h3>
                    <p className="text-xs text-slate-500">
                      {item.projectCount} proyectos · {item.verifiedCount} verificaciones
                    </p>
                  </div>
                  <strong className="text-primary text-2xl">{item.totalScore}/100</strong>
                </div>
              </article>
            ))}
          </div>
          <h2 className="mt-10 text-2xl font-bold">Proyectos y contribuciones confirmadas</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.projects.map((project) => (
              <article className="rounded-2xl bg-slate-50 p-5" key={project.id}>
                <h3 className="font-bold">{project.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{project.description}</p>
                {project.verifiedContributions.map((item) => (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3" key={item.id}>
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <CheckCircle2 className="size-4" />
                      Aporte validado por {item.validatorName}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {item.contributionRole}: {item.contributionSummary}
                    </p>
                  </div>
                ))}
              </article>
            ))}
          </div>
          <h2 className="mt-10 text-2xl font-bold">Experiencias prácticas verificadas</h2>
          <div className="mt-5 space-y-3">
            {data.verifiedExperiences.map((item) => (
              <article className="rounded-2xl border p-5" key={item.id}>
                <BadgeCheck className="text-primary size-6" />
                <h3 className="mt-2 font-bold">{item.title}</h3>
                <p className="text-sm text-slate-500">
                  {item.companyName} · {item.durationWeeks} semanas
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3 border-t pt-7">
            <Button asChild>
              <a href={`${API_URL}/passport/${code}/open-badge`}>
                <ExternalLink className="mr-2 size-4" />
                Descargar OpenBadgeCredential
              </a>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Imprimir pasaporte
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ContributionValidationPage() {
  const { token } = useParams();
  const query = useQuery({
    queryKey: ['contribution-validation', token],
    queryFn: () =>
      apiFetch<{
        project: string;
        candidate: string;
        validatorName: string;
        contributionRole: string;
        contributionSummary: string;
        status: string;
      }>(`/contributions/validate/${token}`),
    enabled: !!token,
  });
  const decision = useMutation({
    mutationFn: (approved: boolean) =>
      apiFetch(`/contributions/validate/${token}`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      }),
  });
  if (query.isLoading)
    return <main className="grid min-h-screen place-items-center">Cargando solicitud…</main>;
  if (query.isError || !query.data)
    return (
      <main className="grid min-h-screen place-items-center">Solicitud inexistente o vencida.</main>
    );
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <section className="w-full max-w-xl rounded-3xl border bg-white p-8 shadow-xl">
        <Fingerprint className="text-primary size-10" />
        <p className="text-primary mt-5 text-xs font-bold uppercase tracking-wider">
          Validación de contribución
        </p>
        <h1 className="mt-2 text-2xl font-bold">{query.data.project}</h1>
        <p className="mt-4 text-slate-600">
          <strong>{query.data.candidate}</strong> afirma haber participado como{' '}
          <strong>{query.data.contributionRole}</strong>.
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">{query.data.contributionSummary}</p>
        {decision.isSuccess ? (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-700">
            Respuesta registrada. Gracias por aportar trazabilidad.
          </p>
        ) : (
          <div className="mt-6 flex gap-3">
            <Button onClick={() => decision.mutate(true)}>Confirmar aporte</Button>
            <Button variant="outline" onClick={() => decision.mutate(false)}>
              No confirmar
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
