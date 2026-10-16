import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileUpload } from '@/components/file-upload';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { CandidateDashboard, Education } from './candidate-types';
import { Panel, QueryState, SectionHeading } from './candidate-page';
import { Field, Select, Textarea, TextInput } from './form-utils';
import { cleanPayload, dateOnly } from './form-helpers';

const optionalUrl = z.union([z.literal(''), z.url('URL no válida')]);
const profileSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  headline: z.string().max(120),
  bio: z.string().max(1500),
  city: z.string().max(120),
  region: z.string().max(120),
  country: z.string().max(120),
  phone: z.string().max(30),
  photoUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  availableNow: z.boolean(),
  workSchedule: z.enum(['', 'FULL_TIME', 'PART_TIME', 'FLEXIBLE']),
  modalities: z.array(z.enum(['PRESENCIAL', 'HIBRIDO', 'REMOTO'])),
  professionalInterests: z.string().max(1000),
});
type ProfileValues = z.infer<typeof profileSchema>;
const educationSchema = z.object({
  institution: z.string().min(2),
  program: z.string().min(2),
  academicLevel: z.string().min(2),
  semester: z.string(),
  status: z.enum(['ESTUDIANDO', 'GRADUADO']),
  expectedGraduationDate: z.string(),
  graduationDate: z.string(),
});
type EducationValues = z.infer<typeof educationSchema>;

export function CandidateProfileSection() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => apiFetch<CandidateDashboard>('/candidate/profile'),
  });
  const [message, setMessage] = useState('');
  const [education, setEducation] = useState<Education | null | 'new'>(null);
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      headline: '',
      bio: '',
      city: '',
      region: '',
      country: '',
      phone: '',
      photoUrl: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      availableNow: false,
      workSchedule: '',
      modalities: [],
      professionalInterests: '',
    },
  });
  useEffect(() => {
    const p = query.data?.profile;
    if (p)
      profileForm.reset({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        headline: p.headline ?? '',
        bio: p.bio ?? '',
        city: p.city ?? '',
        region: p.region ?? '',
        country: p.country ?? '',
        phone: p.phone ?? '',
        photoUrl: p.photoUrl ?? '',
        linkedinUrl: p.linkedinUrl ?? '',
        githubUrl: p.githubUrl ?? '',
        portfolioUrl: p.portfolioUrl ?? '',
        availableNow: p.availableNow,
        workSchedule: p.workSchedule ?? '',
        modalities: p.modalities,
        professionalInterests: p.professionalInterests.join(', '),
      });
  }, [query.data, profileForm]);
  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      apiFetch('/candidate/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...cleanPayload(values),
          professionalInterests: values.professionalInterests
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          workSchedule: values.workSchedule || undefined,
        }),
      }),
    onSuccess: async () => {
      setMessage('Perfil guardado correctamente.');
      await client.invalidateQueries({ queryKey: ['candidate-profile'] });
    },
    onError: (error) =>
      setMessage(error instanceof ApiError ? error.message : 'No fue posible guardar'),
  });
  if (query.isLoading || query.isError)
    return (
      <>
        <SectionHeading
          eyebrow="Mi perfil"
          title="Perfil profesional"
          description="Información que ayuda a las empresas a entender tu potencial."
        />
        <QueryState loading={query.isLoading} error={query.isError} />
      </>
    );
  return (
    <>
      <SectionHeading
        eyebrow="Mi perfil"
        title="Perfil profesional"
        description="Completa tus datos, formación, disponibilidad e intereses."
      />
      <form onSubmit={profileForm.handleSubmit((v) => save.mutate(v))}>
        <Panel>
          <h2 className="text-xl font-semibold text-white">Información personal y profesional</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Nombre" error={profileForm.formState.errors.firstName?.message}>
              <TextInput {...profileForm.register('firstName')} />
            </Field>
            <Field label="Apellido">
              <TextInput {...profileForm.register('lastName')} />
            </Field>
            <Field label="Titular profesional">
              <TextInput {...profileForm.register('headline')} />
            </Field>
            <Field label="Ciudad">
              <TextInput {...profileForm.register('city')} />
            </Field>
            <Field label="Departamento / región">
              <TextInput {...profileForm.register('region')} />
            </Field>
            <Field label="País">
              <TextInput {...profileForm.register('country')} />
            </Field>
            <Field label="Teléfono (opcional)">
              <TextInput {...profileForm.register('phone')} />
            </Field>
              <Field
                label="Fotografía profesional"
                error={profileForm.formState.errors.photoUrl?.message}
              >
                <FileUpload
                  purpose="PROFILE_PHOTO"
                  onUploaded={(url) => profileForm.setValue('photoUrl', url, { shouldDirty: true })}
                />
                <TextInput className="mt-2" {...profileForm.register('photoUrl')} />
              </Field>
            <div className="md:col-span-2">
              <Field label="Descripción profesional">
                <Textarea {...profileForm.register('bio')} />
              </Field>
            </div>
            <Field label="LinkedIn" error={profileForm.formState.errors.linkedinUrl?.message}>
              <TextInput {...profileForm.register('linkedinUrl')} />
            </Field>
            <Field label="GitHub" error={profileForm.formState.errors.githubUrl?.message}>
              <TextInput {...profileForm.register('githubUrl')} />
            </Field>
            <Field label="Portafolio" error={profileForm.formState.errors.portfolioUrl?.message}>
              <TextInput {...profileForm.register('portfolioUrl')} />
            </Field>
            <Field label="Jornada">
              <Select {...profileForm.register('workSchedule')}>
                <option value="">Selecciona</option>
                <option value="FULL_TIME">Tiempo completo</option>
                <option value="PART_TIME">Medio tiempo</option>
                <option value="FLEXIBLE">Flexible</option>
              </Select>
            </Field>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-200">Modalidades</p>
              <div className="flex flex-wrap gap-4">
                {(['PRESENCIAL', 'HIBRIDO', 'REMOTO'] as const).map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" value={item} {...profileForm.register('modalities')} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input type="checkbox" {...profileForm.register('availableNow')} />
              Disponible actualmente
            </label>
            <div className="md:col-span-2">
              <Field label="Intereses profesionales (separados por coma)">
                <Textarea {...profileForm.register('professionalInterests')} />
              </Field>
            </div>
          </div>
          {message && (
            <p className={`mt-5 text-sm ${save.isError ? 'text-red-300' : 'text-primary'}`}>
              {message}
            </p>
          )}
          <Button className="mt-6" type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar perfil'}
          </Button>
        </Panel>
      </form>
      <EducationBlock
        items={query.data!.profile.educations}
        editing={education}
        setEditing={setEducation}
      />
    </>
  );
}

function EducationBlock({
  items,
  editing,
  setEditing,
}: {
  items: Education[];
  editing: Education | null | 'new';
  setEditing: (value: Education | null | 'new') => void;
}) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const form = useForm<EducationValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: '',
      program: '',
      academicLevel: '',
      semester: '',
      status: 'ESTUDIANDO',
      expectedGraduationDate: '',
      graduationDate: '',
    },
  });
  useEffect(() => {
    if (editing && editing !== 'new')
      form.reset({
        institution: editing.institution,
        program: editing.program,
        academicLevel: editing.academicLevel,
        semester: editing.semester?.toString() ?? '',
        status: editing.status,
        expectedGraduationDate: dateOnly(editing.expectedGraduationDate),
        graduationDate: dateOnly(editing.graduationDate),
      });
    else if (editing === 'new') form.reset();
  }, [editing, form]);
  const save = useMutation({
    mutationFn: (v: EducationValues) =>
      apiFetch(
        editing === 'new'
          ? '/candidate/educations'
          : `/candidate/educations/${(editing as Education).id}`,
        {
          method: editing === 'new' ? 'POST' : 'PATCH',
          body: JSON.stringify({
            ...cleanPayload(v),
            semester: v.semester ? Number(v.semester) : undefined,
          }),
        },
      ),
    onSuccess: async () => {
      setEditing(null);
      setMessage('Formación guardada.');
      await client.invalidateQueries({ queryKey: ['candidate-profile'] });
    },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'No fue posible guardar'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/candidate/educations/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['candidate-profile'] }),
  });
  return (
    <Panel className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Formación</h2>
        <Button type="button" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-2 size-4" />
          Agregar
        </Button>
      </div>
      {message && <p className="text-primary mt-3 text-sm">{message}</p>}
      {editing && (
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
        >
          <Field label="Institución">
            <TextInput {...form.register('institution')} />
          </Field>
          <Field label="Programa / carrera">
            <TextInput {...form.register('program')} />
          </Field>
          <Field label="Nivel académico">
            <TextInput {...form.register('academicLevel')} />
          </Field>
          <Field label="Semestre">
            <TextInput type="number" min="1" max="20" {...form.register('semester')} />
          </Field>
          <Field label="Estado">
            <Select {...form.register('status')}>
              <option value="ESTUDIANDO">Estudiando</option>
              <option value="GRADUADO">Graduado</option>
            </Select>
          </Field>
          <Field label="Fecha estimada de graduación">
            <TextInput type="date" {...form.register('expectedGraduationDate')} />
          </Field>
          <Field label="Fecha de graduación">
            <TextInput type="date" {...form.register('graduationDate')} />
          </Field>
          <div className="flex gap-3 md:col-span-2">
            <Button disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar formación'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {!items.length && !editing && (
        <p className="mt-6 text-sm text-slate-400">Aún no has registrado formación académica.</p>
      )}
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 p-4 sm:flex-row"
          >
            <div>
              <h3 className="font-semibold text-white">{item.program}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {item.institution} · {item.academicLevel} · {item.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(item)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2 className="size-4 text-red-300" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
