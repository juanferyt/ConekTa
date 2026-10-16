import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

interface Certificate {
  code: string;
  status: 'ACTIVE' | 'REVOKED';
  issuedAt: string;
  candidate: string;
  company: string;
  project: string;
  description: string;
  startsAt: string;
  completedAt: string;
  durationWeeks: number;
  professionalArea: string;
  skills: { name: string; type: string }[];
  evaluation?: Record<string, number>;
}
export function VerifyCertificatePage() {
  const { certificateCode } = useParams();
  const query = useQuery({
    queryKey: ['verify-certificate', certificateCode],
    queryFn: () => apiFetch<Certificate>(`/verify/${certificateCode}`),
    enabled: !!certificateCode,
  });
  if (query.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        Verificando certificado…
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto size-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold">Certificado no encontrado</h1>
          <p className="mt-2 text-slate-500">Revisa el código de verificación.</p>
        </div>
      </main>
    );
  const c = query.data;
  const url = window.location.href;
  const average = c.evaluation
    ? Object.values(c.evaluation).reduce((a, b) => a + b, 0) / Object.values(c.evaluation).length
    : 0;
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-white shadow-xl print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b bg-slate-950 p-8 text-white">
          <BrandLogo className="h-20 w-56 rounded-xl bg-white" />
          <div className="text-right">
            <p className="text-xs uppercase tracking-[.18em] text-rose-300">Verificación pública</p>
            <p className="mt-2 font-mono text-sm">{c.code}</p>
          </div>
        </header>
        <section className="p-8 sm:p-12">
          <div
            className={`mb-8 flex items-center gap-3 rounded-xl p-4 ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
          >
            {c.status === 'ACTIVE' ? <CheckCircle2 /> : <ShieldAlert />}
            <strong>
              {c.status === 'ACTIVE' ? 'Certificado auténtico y vigente' : 'Certificado revocado'}
            </strong>
          </div>
          <p className="text-primary text-sm font-bold uppercase tracking-wider">
            Certificado de experiencia práctica y competencias verificadas
          </p>
          <h1 className="mt-4 text-4xl font-bold">{c.candidate}</h1>
          <p className="mt-3 text-lg text-slate-600">
            Participó satisfactoriamente en <strong>{c.project}</strong>, desarrollado con{' '}
            {c.company}.
          </p>
          <p className="mt-6 leading-7 text-slate-600">{c.description}</p>
          <div className="mt-8 grid gap-5 rounded-2xl bg-slate-50 p-6 sm:grid-cols-3">
            <div>
              <span className="text-xs text-slate-500">Periodo</span>
              <p className="font-semibold">
                {new Date(c.startsAt).toLocaleDateString()} –{' '}
                {new Date(c.completedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Duración práctica</span>
              <p className="font-semibold">{c.durationWeeks} semanas</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Evaluación promedio</span>
              <p className="font-semibold">{average.toFixed(1)} / 5</p>
            </div>
          </div>
          <h2 className="mt-8 font-bold">Competencias verificadas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.skills.map((skill) => (
              <span
                key={skill.name}
                className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
              >
                {skill.name}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t pt-8">
            <div>
              <QRCodeSVG value={url} size={128} level="M" />
              <p className="mt-2 max-w-40 text-xs text-slate-500">
                Escanea para comprobar autenticidad en ConekTa.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">
                Emitido el {new Date(c.issuedAt).toLocaleDateString()}
              </p>
              <Button className="mt-3 print:hidden" onClick={() => window.print()}>
                Descargar / imprimir PDF
              </Button>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
