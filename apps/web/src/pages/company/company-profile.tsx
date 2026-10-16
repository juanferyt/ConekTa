import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileUpload } from '@/components/file-upload';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Field, Select, Textarea, TextInput } from '../candidate/form-utils';
import { cleanPayload } from '../candidate/form-helpers';
import { CompanyHeading, CompanyPanel, CompanyQueryState } from './company-page';
import type { CompanyProfile } from './company-types';

const url = z.union([z.literal(''), z.url('URL no válida')]);
const schema = z.object({
  name: z.string().min(2),
  logoUrl: url,
  nit: z.string().max(40),
  sector: z.string().min(2),
  description: z.string().min(20).max(2000),
  size: z.enum(['', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE']),
  country: z.string().min(2),
  city: z.string().min(2),
  address: z.string().max(250),
  website: url,
  linkedinUrl: url,
  contactEmail: z.union([z.literal(''), z.email('Correo no válido')]),
  phone: z.string().max(30),
});
type Values = z.infer<typeof schema>;
export function CompanyProfileSection() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => apiFetch<CompanyProfile>('/company/profile'),
  });
  const [message, setMessage] = useState('');
  const [verificationDocument, setVerificationDocument] = useState('');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      logoUrl: '',
      nit: '',
      sector: '',
      description: '',
      size: '',
      country: '',
      city: '',
      address: '',
      website: '',
      linkedinUrl: '',
      contactEmail: '',
      phone: '',
    },
  });
  useEffect(() => {
    if (query.data)
      form.reset({
        name: query.data.name ?? '',
        logoUrl: query.data.logoUrl ?? '',
        nit: query.data.nit ?? '',
        sector: query.data.sector ?? '',
        description: query.data.description ?? '',
        size: query.data.size ?? '',
        country: query.data.country ?? '',
        city: query.data.city ?? '',
        address: query.data.address ?? '',
        website: query.data.website ?? '',
        linkedinUrl: query.data.linkedinUrl ?? '',
        contactEmail: query.data.contactEmail ?? '',
        phone: query.data.phone ?? '',
      });
  }, [query.data, form]);
  const save = useMutation({
    mutationFn: (v: Values) =>
      apiFetch('/company/profile', { method: 'PATCH', body: JSON.stringify(cleanPayload(v)) }),
    onSuccess: async () => {
      setMessage('Perfil empresarial guardado.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['company-profile'] }),
        client.invalidateQueries({ queryKey: ['company-dashboard'] }),
      ]);
    },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'No fue posible guardar'),
  });
  const requestVerification = useMutation({
    mutationFn: () => apiFetch('/company/verification-request', { method: 'POST', body: JSON.stringify({ documentUrl: verificationDocument, documentName: 'RUT o certificado de existencia' }) }),
    onSuccess: async () => { setMessage('Solicitud de verificación enviada. El equipo revisará la identidad de la empresa.'); await client.invalidateQueries({ queryKey: ['company-profile'] }); },
    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'No fue posible solicitar la verificación'),
  });
  if (query.isLoading || query.isError)
    return (
      <>
        <CompanyHeading
          eyebrow="Empresa"
          title="Perfil de empresa"
          description="Información pública para candidatos."
        />
        <CompanyQueryState loading={query.isLoading} error={query.isError} />
      </>
    );
  return (
    <>
      <CompanyHeading
        eyebrow="Empresa"
        title="Perfil de empresa"
        description="Presenta una organización confiable y fácil de conocer."
      />
      <CompanyPanel>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Datos empresariales</h2>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${query.data!.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : query.data!.verificationStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>Verificación: {query.data!.verificationStatus}</span>
            {['UNVERIFIED', 'REJECTED'].includes(query.data!.verificationStatus) && <Button type="button" size="sm" variant="outline" onClick={() => requestVerification.mutate()} disabled={requestVerification.isPending || !verificationDocument}>Solicitar verificación</Button>}
          </div>
        </div>
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
        >
          <Field label="Nombre">
            <TextInput {...form.register('name')} />
          </Field>
          <Field label="Logo" error={form.formState.errors.logoUrl?.message}>
            <FileUpload
              purpose="COMPANY_LOGO"
              onUploaded={(url) => form.setValue('logoUrl', url, { shouldDirty: true })}
            />
            <TextInput className="mt-2" {...form.register('logoUrl')} />
          </Field>
          <Field label="NIT (opcional)">
            <TextInput {...form.register('nit')} />
          </Field>
          {['UNVERIFIED', 'REJECTED'].includes(query.data!.verificationStatus) && <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><Field label="Documento de verificación (RUT o certificado de Cámara de Comercio en PDF)"><FileUpload purpose="COMPANY_VERIFICATION_DOCUMENT" accept="application/pdf" onUploaded={(_url, asset) => asset && setVerificationDocument(asset.id)} /></Field>{query.data!.verificationReason && <p className="mt-2 text-sm text-red-700">Motivo anterior: {query.data!.verificationReason}</p>}</div>}
          <Field label="Sector">
            <TextInput {...form.register('sector')} />
          </Field>
          <Field label="Tamaño">
            <Select {...form.register('size')}>
              <option value="">Selecciona</option>
              <option value="MICRO">Microempresa</option>
              <option value="SMALL">Pequeña</option>
              <option value="MEDIUM">Mediana</option>
              <option value="LARGE">Grande</option>
            </Select>
          </Field>
          <Field label="País">
            <TextInput {...form.register('country')} />
          </Field>
          <Field label="Ciudad">
            <TextInput {...form.register('city')} />
          </Field>
          <Field label="Dirección (opcional)">
            <TextInput {...form.register('address')} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción" error={form.formState.errors.description?.message}>
              <Textarea {...form.register('description')} />
            </Field>
          </div>
          <Field label="Página web" error={form.formState.errors.website?.message}>
            <TextInput {...form.register('website')} />
          </Field>
          <Field label="LinkedIn" error={form.formState.errors.linkedinUrl?.message}>
            <TextInput {...form.register('linkedinUrl')} />
          </Field>
          <Field label="Correo de contacto" error={form.formState.errors.contactEmail?.message}>
            <TextInput type="email" {...form.register('contactEmail')} />
          </Field>
          <Field label="Teléfono">
            <TextInput {...form.register('phone')} />
          </Field>
          <div className="md:col-span-2">
            {message && (
              <p className={`mb-4 text-sm ${save.isError ? 'text-red-600' : 'text-primary'}`}>
                {message}
              </p>
            )}
            <Button disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar perfil'}
            </Button>
          </div>
        </form>
      </CompanyPanel>
    </>
  );
}
