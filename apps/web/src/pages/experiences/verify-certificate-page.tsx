import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { evaluationCriteria, type EvaluationCriterion } from './evaluation-criteria';

interface Certificate {
  code: string;
  status: 'ACTIVE' | 'REVOKED';
  verification: 'VALID' | 'LEGACY' | 'INVALID';
  checkedAt: string;
  issuedAt: string;
  revokedAt: string | null;
  candidate: string;
  company: string;
  issuer: {
    companyId: string;
    evaluatedById: string;
    issuedById: string;
    verifiedAtIssue: boolean;
  };
  project: string;
  description: string;
  startsAt: string;
  completedAt: string;
  durationWeeks: number;
  skills: { id: string; name: string }[];
  evaluation: Record<EvaluationCriterion, number>;
  evaluatedAt: string;
  evidence: {
    workDescription: string;
    projectUrl: string;
    githubUrl: string | null;
    additionalLinks: string[];
    submittedAt: string;
    submissionHash: string;
  };
  payloadHash: string;
  snapshot: unknown;
}
const date = (value: string) => new Date(value).toLocaleString('es-CO');
const safeLink = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export function VerifyCertificatePage() {
  const { certificateCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(certificateCode ?? '');
  const query = useQuery({
    queryKey: ['verify-certificate', certificateCode],
    queryFn: () =>
      apiFetch<Certificate>(`/verify/${encodeURIComponent(certificateCode ?? '')}`, {
        cache: 'no-store',
      }),
    enabled: !!certificateCode,
    retry: false,
    staleTime: 0,
    refetchInterval: 30000,
  });
  const lookup = (
    <form
      className="mx-auto mb-6 flex max-w-4xl flex-wrap gap-3 print:hidden"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) navigate(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
      }}
    >
      <label className="flex-1 text-sm font-medium">
        Código del certificado
        <Input
          className="mt-1"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="CNK-EXP-…"
        />
      </label>
      <Button className="self-end" type="submit">
        Consultar
      </Button>
    </form>
  );
  if (!certificateCode)
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <h1 className="mx-auto mb-6 max-w-4xl text-2xl font-bold">
          Verificar una experiencia ConekTa
        </h1>
        {lookup}
        <p className="mx-auto max-w-4xl text-slate-600">
          Consulta el registro y su vigencia actual. No necesitas iniciar sesión.
        </p>
      </main>
    );
  if (query.isLoading) return <main className="p-8">Consultando el registro del certificado…</main>;
  if (query.isError || !query.data)
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        {lookup}
        <div role="alert" className="mx-auto max-w-4xl rounded-xl bg-white p-6">
          <ShieldAlert className="text-amber-600" />
          <h1 className="mt-3 text-2xl font-bold">
            {query.error instanceof ApiError && query.error.status === 404
              ? 'Certificado no encontrado o no público'
              : 'No se pudo comprobar la vigencia'}
          </h1>
          <p className="mt-3">
            Revisa el código o vuelve a consultar. Sin conexión al registro no se puede confirmar el
            estado actual.
          </p>
          <Button className="mt-4" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      </main>
    );
  const c = query.data;
  if (c.verification !== 'VALID')
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        {lookup}
        <section className="mx-auto max-w-4xl rounded-xl bg-amber-50 p-6">
          <ShieldAlert />
          <h1 className="mt-3 text-2xl font-bold">
            {c.verification === 'LEGACY'
              ? 'Certificado anterior sin evidencia sellada'
              : 'No se pudo verificar la integridad'}
          </h1>
          <p className="mt-3">
            Este registro no se presenta como experiencia verificable. Solicita revisión a la
            administración de ConekTa.
          </p>
          <p className="mt-3 font-mono">
            {c.code} · {c.status}
          </p>
        </section>
      </main>
    );
  const active = c.status === 'ACTIVE';
  const url = `${window.location.origin}/verify/${c.code}`;
  const average =
    evaluationCriteria.reduce((total, [key]) => total + c.evaluation[key], 0) /
    evaluationCriteria.length;
  const downloadEvidence = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            snapshot: c.snapshot,
            payloadHash: c.payloadHash,
            statusAtDownload: c.status,
            checkedAt: c.checkedAt,
            verificationUrl: url,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${c.code}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      {lookup}
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-white shadow-xl print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b bg-slate-950 p-8 text-white">
          <BrandLogo className="h-20 w-56 rounded-xl bg-white" />
          <div>
            <p>Registro de experiencia ConekTa</p>
            <p className="mt-2 font-mono">{c.code}</p>
          </div>
        </header>
        <section className="p-6 sm:p-10">
          <div
            role="status"
            className={`mb-6 rounded-xl p-4 ${active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          >
            {active ? <CheckCircle2 /> : <ShieldAlert />}
            <h1 className="mt-2 text-xl font-bold">
              {active
                ? 'Registro vigente · integridad comprobada'
                : 'CERTIFICADO REVOCADO — sin respaldo vigente'}
            </h1>
            <p className="mt-2 text-sm">
              Consultado: {date(c.checkedAt)}
              {c.revokedAt && ` · Revocado: ${date(c.revokedAt)}`}
            </p>
          </div>
          <h2 className="text-3xl font-bold">{c.candidate}</h2>
          <p className="mt-3">
            Completó la entrega de <strong>{c.project}</strong>, evaluada por{' '}
            <strong>{c.company}</strong>.
          </p>
          <p className="mt-4 text-slate-600">{c.description}</p>
          <dl className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
            <div>
              <dt>Empresa emisora</dt>
              <dd className="font-semibold">
                {c.company} · verificada por administración al emitir
              </dd>
            </div>
            <div>
              <dt>Identificador del emisor</dt>
              <dd className="break-all font-mono text-xs">{c.issuer.companyId}</dd>
            </div>
            <div>
              <dt>Cuenta evaluadora</dt>
              <dd className="break-all font-mono text-xs">{c.issuer.evaluatedById}</dd>
            </div>
            <div>
              <dt>Cuenta que emitió</dt>
              <dd className="break-all font-mono text-xs">{c.issuer.issuedById}</dd>
            </div>
            <div>
              <dt>Aceptación y finalización registradas</dt>
              <dd>
                {date(c.startsAt)} — {date(c.completedAt)}
              </dd>
            </div>
            <div>
              <dt>Duración prevista del reto</dt>
              <dd>{c.durationWeeks} semanas (no acredita horas trabajadas)</dd>
            </div>
          </dl>
          <h2 className="mt-8 text-xl font-bold">Entrega revisada</h2>
          <p className="mt-2 whitespace-pre-wrap">{c.evidence.workDescription}</p>
          <p className="mt-2 text-sm text-slate-500">
            Registrada: {date(c.evidence.submittedAt)} · Evaluada: {date(c.evaluatedAt)}
          </p>
          <ul className="mt-3 space-y-2">
            {[c.evidence.projectUrl, c.evidence.githubUrl, ...c.evidence.additionalLinks]
              .filter((link): link is string => !!link && safeLink(link))
              .map((link, index) => (
                <li key={`${link}-${index}`}>
                  <a
                    className="text-primary break-all underline"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link}
                  </a>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">
            Los enlaces externos pueden cambiar o dejar de estar disponibles. ConekTa conserva los
            datos registrados de la entrega, no una copia de esos sitios.
          </p>
          <h2 className="mt-8 text-xl font-bold">Evaluación: {average.toFixed(1)} / 5</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {evaluationCriteria.map(([key, label]) => (
              <div key={key} className="rounded-lg border p-3">
                <dt>{label}</dt>
                <dd className="font-semibold">{c.evaluation[key]} / 5</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-8 text-xl font-bold">Competencias respaldadas por esta evaluación</h2>
          <p className="mt-3">
            {c.skills.map((skill) => skill.name).join(' · ') ||
              'No se acreditaron competencias específicas.'}
          </p>
          <details className="mt-6 rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              Huella de la evidencia emitida (SHA-256)
            </summary>
            <p className="mt-3 break-all font-mono text-xs">{c.payloadHash}</p>
            <p className="mt-3 text-sm">
              Permite detectar cambios en la copia emitida. No es una firma digital de un tercero ni
              una acreditación externa; el estado vigente se consulta en este registro.
            </p>
            <Button className="mt-3 print:hidden" variant="outline" onClick={downloadEvidence}>
              Descargar evidencia JSON
            </Button>
          </details>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t pt-6">
            <div>
              <QRCodeSVG value={url} size={128} />
              <p className="mt-2 max-w-60 break-all text-xs">{url}</p>
            </div>
            <div>
              <p className="text-sm">Emitido: {date(c.issuedAt)}</p>
              <Button
                className="mt-3 print:hidden"
                disabled={!active || query.isFetching}
                onClick={() => window.print()}
              >
                Imprimir / guardar PDF
              </Button>
              <Button
                className="ml-2 mt-3 print:hidden"
                variant="outline"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Actualizar estado
              </Button>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Una copia impresa refleja el estado consultado en esa fecha. Escanea el QR para
            comprobar revocaciones posteriores.
          </p>
          <Link className="text-primary mt-5 inline-block underline print:hidden" to="/">
            Volver a ConekTa
          </Link>
        </section>
      </article>
    </main>
  );
}
