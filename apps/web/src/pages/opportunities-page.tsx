import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, MapPin, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CompatibilityBadge } from '@/components/compatibility-card';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/use-auth';
import { apiFetch } from '@/lib/api-client';
import type { MatchedVacancy, Vacancy } from './company/company-types';

export function OpportunitiesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    keyword: '',
    city: '',
    modality: '',
    opportunityType: '',
  });
  const [applied, setApplied] = useState(filters);
  const params = new URLSearchParams(Object.entries(applied).filter(([, value]) => value));
  const query = useQuery({
    queryKey: ['public-opportunities', applied],
    queryFn: () => apiFetch<Vacancy[]>(`/opportunities?${params}`),
  });
  const matches = useQuery({
    queryKey: ['candidate-recommendations'],
    queryFn: () => apiFetch<MatchedVacancy[]>('/candidate/recommendations'),
    enabled: user?.role === 'CANDIDATE',
  });
  const scoreById = new Map(matches.data?.map((item) => [item.id, item.compatibility.score]));
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-slate-200 bg-white py-16">
          <div className="container">
            <p className="text-primary text-xs font-bold uppercase tracking-[.16em]">
              Oportunidades
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Encuentra tu próximo comienzo
            </h1>
            <p className="mt-3 text-slate-600">
              Vacantes publicadas para estudiantes y profesionales en etapa inicial.
            </p>
            <form
              className="mt-8 grid gap-3 lg:grid-cols-[1fr_220px_190px_220px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                setApplied(filters);
              }}
            >
              <Input
                placeholder="Cargo o palabra clave"
                value={filters.keyword}
                onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
              />
              <Input
                placeholder="Ciudad"
                value={filters.city}
                onChange={(event) => setFilters({ ...filters, city: event.target.value })}
              />
              <Filter
                value={filters.modality}
                onChange={(value) => setFilters({ ...filters, modality: value })}
                options={[
                  ['', 'Modalidad'],
                  ['PRESENCIAL', 'Presencial'],
                  ['HIBRIDO', 'Híbrido'],
                  ['REMOTO', 'Remoto'],
                ]}
              />
              <Filter
                value={filters.opportunityType}
                onChange={(value) => setFilters({ ...filters, opportunityType: value })}
                options={[
                  ['', 'Tipo de oportunidad'],
                  ['FIRST_JOB', 'Primer empleo'],
                  ['INTERNSHIP', 'Práctica'],
                  ['APPRENTICESHIP', 'Aprendizaje'],
                  ['TRAINEE', 'Trainee'],
                ]}
              />
              <Button>
                <Search className="mr-2 size-4" />
                Buscar
              </Button>
            </form>
          </div>
        </section>
        <section className="container py-12">
          {query.isLoading && <p className="text-slate-500">Buscando oportunidades…</p>}
          {query.isError && (
            <p className="text-red-600">No fue posible cargar las oportunidades.</p>
          )}
          {query.data && !query.data.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <BriefcaseBusiness className="text-primary size-7" />
              <h2 className="mt-4 font-semibold">No encontramos vacantes con estos filtros</h2>
              <p className="mt-2 text-sm text-slate-500">Prueba una búsqueda más amplia.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {query.data?.map((vacancy) => (
              <Link
                key={vacancy.id}
                to={`/opportunities/${vacancy.id}`}
                className="hover:border-primary/40 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary text-xs font-semibold uppercase tracking-wide">
                      {vacancy.opportunityType}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{vacancy.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {vacancy.company.name ?? 'Empresa por completar'}
                    </p>
                  </div>
                  {vacancy.company.logoUrl && (
                    <img
                      src={vacancy.company.logoUrl}
                      alt=""
                      className="size-12 rounded-xl border border-slate-200 object-contain"
                    />
                  )}
                </div>
                {scoreById.has(vacancy.id) && (
                  <div className="mt-4">
                    <CompatibilityBadge score={scoreById.get(vacancy.id)!} />
                  </div>
                )}
                <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">
                  {vacancy.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-slate-100 px-2 py-1">{vacancy.contractType}</span><span className="rounded-md bg-slate-100 px-2 py-1">{vacancy.workSchedule === 'FULL_TIME' ? 'Tiempo completo' : vacancy.workSchedule === 'PART_TIME' ? 'Medio tiempo' : 'Flexible'}</span>{vacancy.showSalary && <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{vacancy.salaryMin?.toLocaleString('es-CO')} – {vacancy.salaryMax?.toLocaleString('es-CO')} COP</span>}</div>
                <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="size-4" />
                  {vacancy.city}{vacancy.department ? `, ${vacancy.department}` : ''} · {vacancy.modality}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Filter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
