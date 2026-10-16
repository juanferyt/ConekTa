import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/use-auth';
import { apiFetch, ApiError } from '@/lib/api-client';
import { dashboardFor } from '@/lib/auth';

const onboardingSchema = z.object({ firstName: z.string().min(2, 'Ingresa tu nombre').max(80).optional(), lastName: z.string().min(2, 'Ingresa tu apellido').max(80).optional(), headline: z.string().max(120).optional(), name: z.string().min(2, 'Ingresa el nombre de la empresa').max(120).optional(), description: z.string().max(1000).optional(), website: z.union([z.literal(''), z.url('Ingresa una URL válida')]).optional(), city: z.string().max(120).optional() });
type Values = z.infer<typeof onboardingSchema>;

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const candidate = user?.role === 'CANDIDATE';
  const roleSchema = onboardingSchema.superRefine((values, context) => {
    if (candidate && !values.firstName) context.addIssue({ code: 'custom', path: ['firstName'], message: 'Ingresa tu nombre' });
    if (candidate && !values.lastName) context.addIssue({ code: 'custom', path: ['lastName'], message: 'Ingresa tu apellido' });
    if (!candidate && !values.name) context.addIssue({ code: 'custom', path: ['name'], message: 'Ingresa el nombre de la empresa' });
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(roleSchema) });
  const submit = handleSubmit(async (values) => { setServerError(''); try { await apiFetch('/profiles/me', { method: 'PATCH', body: JSON.stringify(values) }); navigate(dashboardFor(user!.role), { replace: true }); } catch (error) { setServerError(error instanceof ApiError ? error.message : 'No fue posible guardar el perfil'); } });
  return <AuthShell title="Cuéntanos un poco más" subtitle={candidate ? 'Estos datos serán la base de tu perfil profesional.' : 'Presenta tu organización al talento joven.'} footer={<button className="text-slate-400 underline" onClick={() => navigate(dashboardFor(user!.role))}>Completar más tarde</button>}><form className="space-y-5" onSubmit={submit}>{candidate ? <><Field label="Nombre" name="firstName" register={register} error={errors.firstName?.message} /><Field label="Apellido" name="lastName" register={register} error={errors.lastName?.message} /><Field label="Titular profesional (opcional)" name="headline" register={register} /><Field label="Ciudad (opcional)" name="city" register={register} /></> : <><Field label="Nombre de la empresa" name="name" register={register} error={errors.name?.message} /><Field label="Descripción breve (opcional)" name="description" register={register} /><Field label="Sitio web (opcional)" name="website" register={register} type="url" error={errors.website?.message} /><Field label="Ciudad (opcional)" name="city" register={register} /></>}{serverError && <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{serverError}</p>}<Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar y continuar'}</Button></form></AuthShell>;
}

function Field({ label, name, register, error, type = 'text' }: { label: string; name: keyof Values; register: ReturnType<typeof useForm<Values>>['register']; error?: string; type?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<Input className="mt-2" type={type} {...register(name)} />{error && <span className="mt-2 block text-sm text-red-300">{error}</span>}</label>;
}

