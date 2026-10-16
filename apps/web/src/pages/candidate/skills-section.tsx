import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { CandidateDashboard, CatalogSkill } from './candidate-types';
import { Panel, QueryState, SectionHeading } from './candidate-page';
import { Field, Select } from './form-utils';

const schema = z.object({ skillId: z.string().min(1, 'Selecciona una habilidad'), level: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']) });
type Values = z.infer<typeof schema>;
const labels = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' };

export function CandidateSkills() {
  const client = useQueryClient(); const [message, setMessage] = useState('');
  const profile = useQuery({ queryKey: ['candidate-profile'], queryFn: () => apiFetch<CandidateDashboard>('/candidate/profile') });
  const catalog = useQuery({ queryKey: ['skills-catalog'], queryFn: () => apiFetch<CatalogSkill[]>('/skills') });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { skillId: '', level: 'BASIC' } });
  const add = useMutation({ mutationFn: (values: Values) => apiFetch('/candidate/skills', { method: 'POST', body: JSON.stringify(values) }), onSuccess: async () => { form.reset(); setMessage('Habilidad agregada.'); await client.invalidateQueries({ queryKey: ['candidate-profile'] }); }, onError: (e) => setMessage(e instanceof ApiError ? e.message : 'No fue posible agregar') });
  const update = useMutation({ mutationFn: ({ skillId, level }: Values) => apiFetch(`/candidate/skills/${skillId}`, { method: 'PATCH', body: JSON.stringify({ level }) }), onSuccess: () => client.invalidateQueries({ queryKey: ['candidate-profile'] }) });
  const remove = useMutation({ mutationFn: (id: string) => apiFetch(`/candidate/skills/${id}`, { method: 'DELETE' }), onSuccess: () => client.invalidateQueries({ queryKey: ['candidate-profile'] }) });
  if (profile.isLoading || catalog.isLoading || profile.isError || catalog.isError) return <><SectionHeading eyebrow="Competencias" title="Habilidades" description="Prioriza lo que sabes hacer y define tu nivel actual." /><QueryState loading={profile.isLoading || catalog.isLoading} error={profile.isError || catalog.isError} /></>;
  const selected = new Set(profile.data!.profile.skills.map((item) => item.skillId)); const available = catalog.data!.filter((item) => !selected.has(item.id));
  return <><SectionHeading eyebrow="Competencias" title="Habilidades" description="Agrega habilidades técnicas y blandas desde el catálogo de ConekTa." /><Panel><form className="grid items-end gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={form.handleSubmit((v) => add.mutate(v))}><Field label="Habilidad" error={form.formState.errors.skillId?.message}><Select {...form.register('skillId')}><option value="">Selecciona del catálogo</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</Select></Field><Field label="Nivel"><Select {...form.register('level')}><option value="BASIC">Básico</option><option value="INTERMEDIATE">Intermedio</option><option value="ADVANCED">Avanzado</option></Select></Field><Button disabled={add.isPending || !available.length}>Agregar</Button></form>{!catalog.data!.length && <p className="mt-5 rounded-xl bg-amber-300/10 p-4 text-sm text-amber-100">El catálogo está vacío. Un administrador debe crear habilidades desde Swagger antes de poder agregarlas.</p>}{message && <p className={`mt-4 text-sm ${add.isError ? 'text-red-300' : 'text-primary'}`}>{message}</p>}</Panel><div className="mt-6 grid gap-4 md:grid-cols-2">{profile.data!.profile.skills.map((item) => <Panel key={item.skillId}><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{item.skill.type === 'TECHNICAL' ? 'Técnica' : 'Blanda'}</span><h2 className="mt-3 text-lg font-semibold text-white">{item.skill.name}</h2><p className="text-sm text-slate-500">{item.skill.category}</p></div><Button variant="ghost" size="sm" onClick={() => remove.mutate(item.skillId)}><Trash2 className="size-4 text-red-300" /></Button></div><Select className="mt-5" value={item.level} onChange={(event) => update.mutate({ skillId: item.skillId, level: event.target.value as Values['level'] })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Panel>)}{!profile.data!.profile.skills.length && <Panel><p className="text-sm text-slate-400">Aún no has agregado habilidades.</p></Panel>}</div></>;
}
