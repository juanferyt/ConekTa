import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LockKeyhole, Pencil, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { CatalogSkill } from '../candidate/candidate-types';
import { cleanPayload, dateOnly } from '../candidate/form-helpers';
import { Field, Select, Textarea, TextInput } from '../candidate/form-utils';
import { CompanyHeading, CompanyPanel, CompanyQueryState } from './company-page';
import type { Vacancy } from './company-types';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(30, 'La descripción debe tener al menos 30 caracteres'),
  responsibilities: z.string(),
  requirements: z.string(),
  city: z.string().min(2),
  department: z.string(),
  modality: z.enum(['PRESENCIAL', 'HIBRIDO', 'REMOTO']),
  opportunityType: z.enum(['FIRST_JOB', 'INTERNSHIP', 'APPRENTICESHIP', 'TRAINEE']),
  contractType: z.string().min(2),
  workSchedule: z.enum(['FULL_TIME', 'PART_TIME', 'FLEXIBLE']),
  weeklyHours: z.string(),
  benefits: z.string(),
  requiresUniversityAgreement: z.boolean(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  currency: z.string().length(3),
  showSalary: z.boolean(),
  deadline: z.string(),
  relatedCareers: z.string(),
  maxExperienceMonths: z.string(),
  experienceRequired: z.boolean(),
});
type Values = z.infer<typeof schema>;
type SelectedSkill = { skillId: string; priority: 'REQUIRED' | 'DESIRED'; weight: number };
const defaults: Values = {
  title: '',
  description: '',
  responsibilities: '',
  requirements: '',
  city: '',
  department: '',
  modality: 'PRESENCIAL',
  opportunityType: 'FIRST_JOB',
  contractType: '',
  workSchedule: 'FULL_TIME',
  weeklyHours: '',
  benefits: '',
  requiresUniversityAgreement: false,
  salaryMin: '',
  salaryMax: '',
  currency: 'COP',
  showSalary: false,
  deadline: '',
  relatedCareers: '',
  maxExperienceMonths: '0',
  experienceRequired: false,
};
export function CompanyVacancies() {
  const client = useQueryClient();
  const vacancies = useQuery({
    queryKey: ['company-vacancies'],
    queryFn: () => apiFetch<Vacancy[]>('/company/vacancies'),
  });
  const catalog = useQuery({
    queryKey: ['skills-catalog'],
    queryFn: () => apiFetch<CatalogSkill[]>('/skills'),
  });
  const [editing, setEditing] = useState<Vacancy | 'new' | null>(null);
  const [skills, setSkills] = useState<SelectedSkill[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  useEffect(() => {
    if (editing && editing !== 'new') {
      form.reset({
        title: editing.title,
        description: editing.description,
        responsibilities: editing.responsibilities.join('\n'),
        requirements: editing.requirements.join('\n'),
        city: editing.city,
        department: editing.department ?? '',
        modality: editing.modality,
        opportunityType: editing.opportunityType,
        contractType: editing.contractType,
        workSchedule: editing.workSchedule ?? 'FULL_TIME',
        weeklyHours: editing.weeklyHours?.toString() ?? '',
        benefits: (editing.benefits ?? []).join('\n'),
        requiresUniversityAgreement: editing.requiresUniversityAgreement ?? false,
        salaryMin: editing.salaryMin?.toString() ?? '',
        salaryMax: editing.salaryMax?.toString() ?? '',
        currency: editing.currency,
        showSalary: editing.showSalary,
        deadline: dateOnly(editing.deadline),
        relatedCareers: editing.relatedCareers.join(', '),
        maxExperienceMonths: editing.maxExperienceMonths.toString(),
        experienceRequired: editing.experienceRequired,
      });
      setSkills(
        editing.skills.map(({ skillId, priority, weight }) => ({ skillId, priority, weight })),
      );
    } else if (editing === 'new') {
      form.reset(defaults);
      setSkills([]);
    }
  }, [editing, form]);
  const save = useMutation({
    mutationFn: (v: Values) => {
      const payload = {
        ...cleanPayload(v),
        responsibilities: v.responsibilities
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        requirements: v.requirements
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        relatedCareers: v.relatedCareers
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        benefits: v.benefits.split('\n').map((x) => x.trim()).filter(Boolean),
        weeklyHours: v.weeklyHours ? Number(v.weeklyHours) : undefined,
        salaryMin: v.salaryMin ? Number(v.salaryMin) : undefined,
        salaryMax: v.salaryMax ? Number(v.salaryMax) : undefined,
        maxExperienceMonths: Number(v.maxExperienceMonths),
        skills,
      };
      return apiFetch(
        editing === 'new' ? '/company/vacancies' : `/company/vacancies/${(editing as Vacancy).id}`,
        { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(payload) },
      );
    },
    onSuccess: async () => {
      setEditing(null);
      setMessage('Vacante guardada como borrador.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['company-vacancies'] }),
        client.invalidateQueries({ queryKey: ['company-dashboard'] }),
      ]);
    },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'No fue posible guardar'),
  });
  const action = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'publish' | 'close' | 'delete' }) =>
      apiFetch(`/company/vacancies/${id}${type === 'delete' ? '' : `/${type}`}`, {
        method: type === 'delete' ? 'DELETE' : 'POST',
      }),
    onSuccess: async () => {
      setMessage('Estado de la vacante actualizado.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['company-vacancies'] }),
        client.invalidateQueries({ queryKey: ['company-dashboard'] }),
      ]);
    },
  });
  if (vacancies.isLoading || catalog.isLoading || vacancies.isError || catalog.isError)
    return (
      <>
        <CompanyHeading
          eyebrow="Selección"
          title="Vacantes"
          description="Crea oportunidades enfocadas en talento joven."
        />
        <CompanyQueryState
          loading={vacancies.isLoading || catalog.isLoading}
          error={vacancies.isError || catalog.isError}
        />
      </>
    );
  const visible = vacancies.data!.filter((v) => filter === 'ALL' || v.status === filter);
  return (
    <>
      <CompanyHeading
        eyebrow="Selección"
        title="Vacantes"
        description="Crea, publica y administra oportunidades con experiencia no requerida por defecto."
      />
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex gap-2">
          {['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="mr-2 size-4" />
          Nueva vacante
        </Button>
      </div>
      {message && <p className="text-primary mb-5 text-sm">{message}</p>}
      {editing && (
        <CompanyPanel className="mb-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editing === 'new' ? 'Crear vacante' : 'Editar vacante'}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              <XCircle className="size-5" />
            </Button>
          </div>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
          >
            <Field label="Título">
              <TextInput {...form.register('title')} />
            </Field>
            <Field label="Ciudad">
              <TextInput {...form.register('city')} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descripción" error={form.formState.errors.description?.message}>
                <Textarea {...form.register('description')} />
              </Field>
            </div>
            <Field label="Responsabilidades (una por línea)">
              <Textarea {...form.register('responsibilities')} />
            </Field>
            <Field label="Requisitos (uno por línea)">
              <Textarea {...form.register('requirements')} />
            </Field>
            <Field label="Modalidad">
              <Select {...form.register('modality')}>
                <option value="PRESENCIAL">Presencial</option>
                <option value="HIBRIDO">Híbrido</option>
                <option value="REMOTO">Remoto</option>
              </Select>
            </Field>
            <Field label="Tipo de oportunidad">
              <Select {...form.register('opportunityType')}>
                <option value="FIRST_JOB">Primer empleo</option>
                <option value="INTERNSHIP">Práctica</option>
                <option value="APPRENTICESHIP">Aprendizaje</option>
                <option value="TRAINEE">Trainee</option>
              </Select>
            </Field>
            <Field label="Tipo de contrato">
              <Select {...form.register('contractType')}>
                <option value="">Selecciona</option><option value="Término indefinido">Término indefinido</option><option value="Término fijo">Término fijo</option><option value="Obra o labor">Obra o labor</option><option value="Contrato de aprendizaje">Contrato de aprendizaje</option><option value="Práctica académica">Práctica académica</option><option value="Prestación de servicios">Prestación de servicios</option>
              </Select>
            </Field>
            <Field label="Departamento"><TextInput placeholder="Ej. Antioquia" {...form.register('department')} /></Field>
            <Field label="Jornada"><Select {...form.register('workSchedule')}><option value="FULL_TIME">Tiempo completo</option><option value="PART_TIME">Medio tiempo</option><option value="FLEXIBLE">Flexible</option></Select></Field>
            <Field label="Horas semanales"><TextInput type="number" min="1" max="48" {...form.register('weeklyHours')} /></Field>
            <div className="md:col-span-2"><Field label="Beneficios (uno por línea)"><Textarea placeholder="Auxilio de conectividad&#10;Horario flexible" {...form.register('benefits')} /></Field></div>
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" {...form.register('requiresUniversityAgreement')} />Requiere convenio con institución educativa</label>
            <Field label="Fecha límite">
              <TextInput type="date" {...form.register('deadline')} />
            </Field>
            <Field label="Salario mínimo (opcional)">
              <TextInput type="number" min="0" {...form.register('salaryMin')} />
            </Field>
            <Field label="Salario máximo (opcional)">
              <TextInput type="number" min="0" {...form.register('salaryMax')} />
            </Field>
            <Field label="Moneda">
              <TextInput maxLength={3} {...form.register('currency')} />
            </Field>
            <Field label="Experiencia máxima en meses">
              <TextInput type="number" min="0" max="36" {...form.register('maxExperienceMonths')} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Carreras relacionadas (separadas por coma)">
                <TextInput {...form.register('relatedCareers')} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" {...form.register('showSalary')} />
              Mostrar salario públicamente
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" {...form.register('experienceRequired')} />
              Esta vacante requiere experiencia
            </label>
            <SkillEditor catalog={catalog.data!} value={skills} onChange={setSkills} />
            <div className="flex gap-3 md:col-span-2">
              <Button disabled={save.isPending}>
                {save.isPending ? 'Guardando…' : 'Guardar vacante'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CompanyPanel>
      )}
      <div className="space-y-4">
        {visible.map((v) => (
          <CompanyPanel key={v.id}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${v.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : v.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}
                  >
                    {v.status}
                  </span>
                  <span className="text-primary rounded-full bg-rose-50 px-2 py-1 text-xs">
                    {v.opportunityType}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{v.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {v.city}{v.department ? `, ${v.department}` : ''} · {v.contractType} · {v.workSchedule === 'FULL_TIME' ? 'Tiempo completo' : v.workSchedule === 'PART_TIME' ? 'Medio tiempo' : 'Flexible'} · {v._count.applications} postulaciones
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>
                  <Pencil className="size-4" />
                </Button>
                {v.status === 'DRAFT' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => action.mutate({ id: v.id, type: 'publish' })}
                  >
                    <Send className="size-4" />
                  </Button>
                )}
                {v.status === 'PUBLISHED' && (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/opportunities/${v.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => action.mutate({ id: v.id, type: 'close' })}
                    >
                      <LockKeyhole className="size-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => action.mutate({ id: v.id, type: 'delete' })}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{v.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {v.skills.map((s) => (
                <span
                  key={s.skillId}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  {s.skill.name} · {s.priority}
                </span>
              ))}
            </div>
          </CompanyPanel>
        ))}
        {!visible.length && (
          <CompanyPanel>
            <p className="text-sm text-slate-500">No hay vacantes en este estado.</p>
          </CompanyPanel>
        )}
      </div>
    </>
  );
}
function SkillEditor({
  catalog,
  value,
  onChange,
}: {
  catalog: CatalogSkill[];
  value: SelectedSkill[];
  onChange: (v: SelectedSkill[]) => void;
}) {
  const available = catalog.filter((s) => !value.some((v) => v.skillId === s.id));
  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Habilidades de la vacante</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!available.length}
          onClick={() =>
            available[0] &&
            onChange([...value, { skillId: available[0].id, priority: 'REQUIRED', weight: 3 }])
          }
        >
          Agregar habilidad
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {value.map((item, index) => (
          <div
            key={item.skillId}
            className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_160px_120px_auto]"
          >
            <Select
              value={item.skillId}
              onChange={(e) =>
                onChange(value.map((v, i) => (i === index ? { ...v, skillId: e.target.value } : v)))
              }
            >
              {catalog
                .filter((s) => s.id === item.skillId || !value.some((v) => v.skillId === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
            <Select
              value={item.priority}
              onChange={(e) =>
                onChange(
                  value.map((v, i) =>
                    i === index
                      ? { ...v, priority: e.target.value as SelectedSkill['priority'] }
                      : v,
                  ),
                )
              }
            >
              <option value="REQUIRED">Requerida</option>
              <option value="DESIRED">Deseable</option>
            </Select>
            <Select
              value={item.weight}
              onChange={(e) =>
                onChange(
                  value.map((v, i) => (i === index ? { ...v, weight: Number(e.target.value) } : v)),
                )
              }
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  Peso {w}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!catalog.length && (
          <p className="mt-3 text-sm text-amber-700">
            El administrador debe crear habilidades en el catálogo.
          </p>
        )}
      </div>
    </div>
  );
}
