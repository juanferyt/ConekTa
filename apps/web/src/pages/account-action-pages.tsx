import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';

const emailSchema = z.object({ email: z.email('Ingresa un correo válido') });
const passwordSchema = z.object({ password: z.string().min(8, 'Mínimo 8 caracteres').max(72), confirmation: z.string() }).refine((v) => v.password === v.confirmation, { message: 'Las contraseñas no coinciden', path: ['confirmation'] });

export function ForgotPasswordPage() {
  const [message,setMessage]=useState(''); const form=useForm<z.infer<typeof emailSchema>>({resolver:zodResolver(emailSchema)});
  const submit=form.handleSubmit(async values=>{try{const result=await apiFetch<{message:string}>('/auth/forgot-password',{method:'POST',body:JSON.stringify(values)});setMessage(result.message)}catch(e){setMessage(e instanceof ApiError?e.message:'No fue posible enviar el correo')}});
  return <AuthShell title="Recupera tu acceso" subtitle="Enviaremos un enlace de un solo uso al correo registrado." footer={<Link className="font-semibold text-primary" to="/login">Volver al inicio de sesión</Link>}><form className="space-y-5" onSubmit={submit}><label className="block text-sm font-medium">Correo<Input className="mt-2" type="email" {...form.register('email')}/></label>{form.formState.errors.email&&<p className="text-sm text-red-300">{form.formState.errors.email.message}</p>}{message&&<p className="rounded-xl bg-white/10 p-3 text-sm">{message}</p>}<Button className="w-full" disabled={form.formState.isSubmitting}>Enviar instrucciones</Button></form></AuthShell>;
}

export function ResetPasswordPage() {
  const [params]=useSearchParams(); const token=params.get('token')??''; const [message,setMessage]=useState(''); const form=useForm<z.infer<typeof passwordSchema>>({resolver:zodResolver(passwordSchema)});
  const submit=form.handleSubmit(async values=>{try{await apiFetch<void>('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password:values.password})});setMessage('Contraseña actualizada. Ya puedes iniciar sesión.')}catch(e){setMessage(e instanceof ApiError?e.message:'No fue posible cambiar la contraseña')}});
  return <AuthShell title="Define una nueva contraseña" subtitle="El enlace solo puede utilizarse una vez." footer={<Link className="font-semibold text-primary" to="/login">Ir al inicio de sesión</Link>}><form className="space-y-5" onSubmit={submit}><Input type="password" placeholder="Nueva contraseña" {...form.register('password')}/><Input type="password" placeholder="Confirmar contraseña" {...form.register('confirmation')}/>{form.formState.errors.confirmation&&<p className="text-sm text-red-300">{form.formState.errors.confirmation.message}</p>}{message&&<p className="rounded-xl bg-white/10 p-3 text-sm">{message}</p>}<Button className="w-full" disabled={!token||form.formState.isSubmitting}>Cambiar contraseña</Button></form></AuthShell>;
}

export function VerifyEmailPage() {
  const [params]=useSearchParams(); const token=params.get('token')??''; const [state,setState]=useState('Confirma que deseas verificar tu correo.');
  const verify=async()=>{try{await apiFetch<void>('/auth/verify-email',{method:'POST',body:JSON.stringify({token})});setState('Correo verificado correctamente. Ya puedes continuar.')}catch(e){setState(e instanceof ApiError?e.message:'No fue posible verificar el correo')}};
  return <AuthShell title="Verifica tu correo" subtitle={state} footer={<Link className="font-semibold text-primary" to="/login">Ir al inicio de sesión</Link>}><Button className="w-full" disabled={!token} onClick={verify}>Verificar correo</Button></AuthShell>;
}
