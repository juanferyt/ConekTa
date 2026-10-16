import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { Button } from './ui/button';

type Purpose =
  | 'PROFILE_PHOTO'
  | 'COMPANY_LOGO'
  | 'PROJECT_ATTACHMENT'
  | 'CHAT_ATTACHMENT'
  | 'COMPANY_VERIFICATION_DOCUMENT';
export function FileUpload({
  purpose,
  onUploaded,
  accept = 'image/png,image/jpeg,image/webp',
}: {
  purpose: Purpose;
  onUploaded: (url: string, asset?: { id: string; originalName: string; publicUrl: string }) => void;
  accept?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setStatus('');
    try {
      const signed = await apiFetch<{
        objectKey: string;
        uploadUrl: string;
        headers: Record<string, string>;
      }>('/files/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose,
        }),
      });
      const sent = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: signed.headers,
        body: file,
      });
      if (!sent.ok) throw new Error('No fue posible transferir el archivo');
      const asset = await apiFetch<{ id: string; originalName: string; publicUrl: string }>('/files/confirm', {
        method: 'POST',
        body: JSON.stringify({ objectKey: signed.objectKey }),
      });
      onUploaded(asset.publicUrl, asset);
      setStatus('Archivo cargado correctamente.');
    } catch (e) {
      setStatus(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No fue posible cargar',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-4">
      <input
        type="file"
        accept={accept}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <Button type="button" size="sm" className="mt-3" onClick={upload} disabled={!file || busy}>
        {busy ? 'Cargando…' : 'Subir archivo'}
      </Button>
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  );
}
