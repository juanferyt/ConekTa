import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, GraduationCap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/use-auth';
import { ApiError } from '@/lib/api-client';
import { dashboardFor } from '@/lib/auth';

const schema = z.object({
  email: z.email('Ingresa un correo válido'), password: z.string().min(8, 'Mínimo 8 caracteres').max(72), confirmPassword: z.string(), role: z.enum(['CANDIDATE', 'COMPANY']),
  termsAccepted: z.literal(true, 'Debes aceptar los términos'), privacyAccepted: z.literal(true, 'Debes autorizar el tratamiento de datos'), majorityAgeConfirmed: z.literal(true, 'Debes confirmar que eres mayor de edad'), marketingConsent: z.boolean(),
}).refine(value => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' });
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const [params] = useSearchParams(); const initialRole = params.get('role') === 'COMPANY' ? 'COMPANY' : 'CANDIDATE';
  const { register: createAccount, user } = useAuth(); const navigate = useNavigate(); const [serverError, setServerError] = useState('');
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: initialRole, marketingConsent: false } });
  if (user) return <Navigate to={dashboardFor(user.role)} replace />;
  const role = form.watch('role');
  const submit = form.handleSubmit(async values => { setServerError(''); try { await createAccount(values.email, values.password, values.role, { termsAccepted: values.termsAccepted, privacyAccepted: values.privacyAccepted, majorityAgeConfirmed: values.majorityAgeConfirmed, marketingConsent: values.marketingConsent }); navigate('/onboarding', { replace: true }); } catch (error) { setServerError(error instanceof ApiError ? error.message : 'No fue posible crear la cuenta'); } });
  return <AuthShell title="Crea tu cuenta" subtitle="Únete a ConekTa de forma segura y transparente." footer={<>¿Ya tienes cuenta? <Link className="font-semibold text-primary" to="/login">Inicia sesión</Link></>}>
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3"><Role active={role === 'CANDIDATE'} onClick={() => form.setValue('role', 'CANDIDATE')} icon={<GraduationCap className="mb-3 size-5" />}>Busco oportunidades</Role><Role active={role === 'COMPANY'} onClick={() => form.setValue('role', 'COMPANY')} icon={<Building2 className="mb-3 size-5" />}>Represento una empresa</Role></div><input type="hidden" {...form.register('role')} />
      <label className="block text-sm font-medium text-slate-700">Correo electrónico<Input className="mt-2" type="email" autoComplete="email" {...form.register('email')} /></label><Error text={form.formState.errors.email?.message} />
      <label className="block text-sm font-medium text-slate-700">Contraseña<Input className="mt-2" type="password" autoComplete="new-password" {...form.register('password')} /></label><Error text={form.formState.errors.password?.message} />
      <label className="block text-sm font-medium text-slate-700">Confirma tu contraseña<Input className="mt-2" type="password" autoComplete="new-password" {...form.register('confirmPassword')} /></label><Error text={form.formState.errors.confirmPassword?.message} />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <Consent input={form.register('termsAccepted')} error={form.formState.errors.termsAccepted?.message}>Acepto los <Link className="font-semibold text-primary" to="/terminos-y-condiciones" target="_blank">términos y condiciones</Link>.</Consent>
        <Consent input={form.register('privacyAccepted')} error={form.formState.errors.privacyAccepted?.message}>Autorizo el tratamiento de mis datos según la <Link className="font-semibold text-primary" to="/politica-de-privacidad" target="_blank">política de privacidad</Link>.</Consent>
        <Consent input={form.register('majorityAgeConfirmed')} error={form.formState.errors.majorityAgeConfirmed?.message}>Confirmo que soy mayor de 18 años.</Consent>
        <Consent input={form.register('marketingConsent')}>Quiero recibir novedades y oportunidades (opcional).</Consent>
      </div>
      {serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
    </form>
  </AuthShell>;
}
function Role({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left text-sm transition ${active ? 'border-primary bg-rose-50 text-slate-950' : 'border-slate-200 text-slate-500'}`}>{icon}<span className="font-semibold">{children}</span></button>; }
function Consent({ input, children, error }: { input: UseFormRegisterReturn; children: ReactNode; error?: string }) { return <div><label className="flex items-start gap-2.5"><input className="mt-0.5 size-4 accent-rose-500" type="checkbox" {...input} /><span>{children}</span></label>{error && <p className="mt-1 pl-6 text-red-600">{error}</p>}</div>; }
function Error({ text }: { text?: string }) { return text ? <p className="-mt-3 text-sm text-red-600">{text}</p> : null; }
