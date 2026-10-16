import { CheckCircle2, CircleAlert, Sparkles } from 'lucide-react';

export interface MatchResult {
  verifiedEvidenceBonus?: number;
  unassessedCriteria?: (keyof MatchResult['breakdown'])[];
  score: number;
  strengths: string[];
  missingSkills: string[];
  breakdown: {
    skills: number;
    education: number;
    projects: number;
    softSkills: number;
    availability: number;
  };
  recommendation: string;
}

const labels: Record<keyof MatchResult['breakdown'], string> = {
  skills: 'Habilidades técnicas',
  education: 'Formación',
  projects: 'Proyectos',
  softSkills: 'Habilidades blandas',
  availability: 'Disponibilidad',
};
const maximums: MatchResult['breakdown'] = {
  skills: 50,
  education: 20,
  projects: 15,
  softSkills: 10,
  availability: 5,
};

export function CompatibilityBadge({ score }: { score: number }) {
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
      <Sparkles className="size-3.5" />
      {score}% compatible contigo
    </span>
  );
}

export function CompatibilityCard({ match }: { match: MatchResult }) {
  return (
    <section className="border-primary/20 bg-primary/[.04] rounded-2xl border p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-bold uppercase tracking-[.14em]">
            Compatibilidad
          </p>
          <p className="mt-2 text-4xl font-bold">{match.score}%</p>
        </div>
        <div className="border-primary/20 text-primary grid size-20 place-items-center rounded-full border-8 text-lg font-bold">
          {match.score}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{match.recommendation}</p>
      <p className="mt-2 text-xs text-slate-500">
        Índice orientativo de 0 a 100; no es una probabilidad de contratación.
      </p>
      {!!match.verifiedEvidenceBonus && (
        <p className="mt-2 text-sm text-slate-600">
          Bono por evidencia verificada: hasta {match.verifiedEvidenceBonus} puntos adicionales al
          desglose, con un total máximo de 100.
        </p>
      )}
      <div className="mt-6 space-y-3">
        {Object.entries(match.breakdown).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-xs">
              <span>{labels[key as keyof MatchResult['breakdown']]}</span>
              <strong>
                {match.unassessedCriteria?.includes(key as keyof MatchResult['breakdown'])
                  ? 'Sin criterio definido'
                  : `${value}/${maximums[key as keyof MatchResult['breakdown']]}`}
              </strong>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${(value / maximums[key as keyof MatchResult['breakdown']]) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {match.strengths.length > 0 && (
        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-emerald-600" />
            Fortalezas
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {match.strengths.map((item) => (
              <span
                key={item}
                className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      {match.missingSkills.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CircleAlert className="size-4 text-amber-600" />
            Habilidades requeridas por fortalecer
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {match.missingSkills.map((item) => (
              <span key={item} className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
