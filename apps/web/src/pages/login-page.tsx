import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/use-auth';
import { ApiError } from '@/lib/api-client';
import { dashboardFor } from '@/lib/auth';

const schema = z.object({ email: z.email('Ingresa un correo válido'), password: z.string().min(8, 'Mínimo 8 caracteres') });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to={dashboardFor(user.role)} replace />;
  const submit = handleSubmit(async (values) => { setServerError(''); try { const loggedUser = await login(values.email, values.password); navigate(dashboardFor(loggedUser.role), { replace: true }); } catch (error) { setServerError(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión'); } });
  return <AuthShell title="Bienvenido de vuelta" subtitle="Ingresa para continuar construyendo tu próxima oportunidad." footer={<>¿Aún no tienes cuenta? <Link className="font-semibold text-primary" to="/register">Regístrate</Link></>}><form className="space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">Correo electrónico<Input className="mt-2" type="email" autoComplete="email" {...register('email')} /></label>{errors.email && <p className="-mt-3 text-sm text-red-300">{errors.email.message}</p>}<label className="block text-sm font-medium text-slate-700">Contraseña<Input className="mt-2" type="password" autoComplete="current-password" {...register('password')} /></label><div className="-mt-3 text-right"><Link className="text-sm font-medium text-primary" to="/forgot-password">¿Olvidaste tu contraseña?</Link></div>{errors.password && <p className="-mt-3 text-sm text-red-300">{errors.password.message}</p>}{serverError && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{serverError}</p>}<Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}</Button></form></AuthShell>;
}

