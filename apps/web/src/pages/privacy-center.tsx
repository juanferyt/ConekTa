import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/use-auth';
import { apiFetch } from '@/lib/api-client';

type Privacy = { marketingConsent: boolean; visibleToCompanies: boolean; termsAcceptedAt?: string; termsVersion?: string; privacyAcceptedAt?: string; privacyVersion?: string; majorityAgeConfirmedAt?: string; deletionRequestedAt?: string };
export function PrivacyCenter() {
  const { user } = useAuth(); const client = useQueryClient(); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['privacy'], queryFn: () => apiFetch<Privacy>('/users/me/privacy') });
  const save = useMutation({ mutationFn: (data: Pick<Privacy, 'marketingConsent'|'visibleToCompanies'>) => apiFetch('/users/me/privacy', { method: 'PATCH', body: JSON.stringify(data) }), onSuccess: async () => { setMessage('Preferencias guardadas.'); await client.invalidateQueries({ queryKey: ['privacy'] }); } });
  const deletion = useMutation({ mutationFn: () => apiFetch<Pick<Privacy,'deletionRequestedAt'>>('/users/me/deletion-request', { method: 'POST' }), onSuccess: async () => { setMessage('Solicitud registrada. Revisaremos la eliminación y las obligaciones de conservación aplicables.'); await client.invalidateQueries({ queryKey: ['privacy'] }); } });
  const download = async () => { const data = await apiFetch<unknown>('/users/me/export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `conekta-mis-datos-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url); };
  if (!query.data) return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Cargando centro de privacidad…</div>;
  const data = query.data;
  return <><header className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Control de tus datos</p><h1 className="mt-2 text-3xl font-bold">Privacidad y autogestión</h1><p className="mt-3 text-slate-600">Consulta tus consentimientos, controla el uso de tu perfil y ejerce tus derechos.</p></header>
    {message && <p className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card icon={<ShieldCheck />} title="Consentimientos registrados"><Info label="Términos" value={data.termsAcceptedAt ? `Aceptados · versión ${data.termsVersion}` : 'Sin registro'} /><Info label="Privacidad" value={data.privacyAcceptedAt ? `Autorizada · versión ${data.privacyVersion}` : 'Sin registro histórico'} /><Info label="Mayoría de edad" value={data.majorityAgeConfirmedAt ? 'Confirmada' : 'Sin registro histórico'} /></Card>
      <Card icon={<Mail />} title="Comunicaciones"><Toggle checked={data.marketingConsent} label="Recibir novedades y oportunidades" onChange={value => save.mutate({ marketingConsent: value, visibleToCompanies: data.visibleToCompanies })} /></Card>
      {user?.role === 'CANDIDATE' && <Card icon={<Eye />} title="Visibilidad del perfil"><Toggle checked={data.visibleToCompanies} label="Permitir que empresas vean mi perfil dentro de procesos legítimos" onChange={value => save.mutate({ marketingConsent: data.marketingConsent, visibleToCompanies: value })} /></Card>}
      <Card icon={<Download />} title="Portabilidad"><p className="mb-4 text-sm leading-6 text-slate-600">Descarga una copia estructurada de los datos principales asociados a tu cuenta.</p><Button variant="outline" onClick={() => void download()}><Download className="mr-2 size-4" />Descargar mis datos</Button></Card>
      <Card icon={<Trash2 />} title="Eliminación de cuenta"><p className="mb-4 text-sm leading-6 text-slate-600">Solicita la eliminación. Antes de ejecutarla revisaremos postulaciones, obligaciones legales y datos que deban conservarse.</p>{data.deletionRequestedAt ? <p className="text-sm font-medium text-amber-700">Solicitud registrada el {new Date(data.deletionRequestedAt).toLocaleDateString('es-CO')}.</p> : <Button variant="outline" onClick={() => { if (window.confirm('¿Deseas registrar la solicitud de eliminación de tu cuenta?')) deletion.mutate(); }}><Trash2 className="mr-2 size-4" />Solicitar eliminación</Button>}</Card>
    </div></>;
}
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3 text-primary">{icon}<h2 className="font-semibold text-slate-900">{title}</h2></div>{children}</section>; }
function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value:boolean)=>void }) { return <label className="flex cursor-pointer items-center justify-between gap-5 text-sm text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="size-5 accent-rose-500" /></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value}</span></div>; }
