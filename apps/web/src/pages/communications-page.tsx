import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, apiFetch, tokenStorage } from '@/lib/api-client';
import { useAuth } from '@/contexts/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/file-upload';
import { PushSettings } from '@/components/push-settings';

interface Conversation {
  id: string;
  application: {
    id: string;
    vacancy: { title: string };
    candidate: { firstName?: string; lastName?: string };
    company: { name?: string };
  };
  messages: { body: string; createdAt: string }[];
}
interface Message {
  id: string;
  senderId: string;
  body: string;
  attachmentUrl?: string;
  createdAt: string;
}
interface Interview {
  id: string;
  applicationId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location?: string;
  meetingUrl?: string;
  status: string;
  application: {
    vacancy: { title: string };
    candidate: { firstName?: string; lastName?: string };
    company: { name?: string };
  };
}
interface Application {
  id: string;
  status: string;
  vacancy: { title: string };
  candidate?: { firstName?: string; lastName?: string };
}
interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export function CommunicationsPage({
  mode,
}: {
  mode: 'messages' | 'interviews' | 'notifications';
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<Conversation[]>('/communications/conversations'),
    refetchInterval: 5000,
  });
  const [selected, setSelected] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [online, setOnline] = useState(false);
  const closeCall = useCallback((notify=true)=>{if(notify&&selected)socketRef.current?.emit('call:signal',{conversationId:selected,type:'hangup'});peerRef.current?.close();peerRef.current=null;localStreamRef.current?.getTracks().forEach(track=>track.stop());localStreamRef.current=null;if(localVideoRef.current)localVideoRef.current.srcObject=null;if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null;setIncomingOffer(null);setCallState('idle');},[selected]);
  const messages = useQuery({
    queryKey: ['messages', selected],
    queryFn: () => apiFetch<Message[]>(`/communications/conversations/${selected}/messages`),
    enabled: Boolean(selected),
    refetchInterval: 4000,
  });
  useEffect(() => {
    if (!selected) return;
    const socket = io(`${API_URL}/realtime`, { auth: { token: tokenStorage.get() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('conversation:join', { conversationId: selected }));
    socket.on('message:new', () => void client.invalidateQueries({ queryKey: ['messages', selected] }));
    socket.on('presence:changed', (event: { conversationId: string; online: boolean }) => { if (event.conversationId === selected) setOnline(event.online); });
    socket.on('call:signal', async (event: { type: 'offer'|'answer'|'ice'|'hangup'; data?: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
      if (event.type === 'offer') { setIncomingOffer(event.data as RTCSessionDescriptionInit); setCallState('incoming'); }
      if (event.type === 'answer' && peerRef.current) { await peerRef.current.setRemoteDescription(event.data as RTCSessionDescriptionInit); setCallState('connected'); }
      if (event.type === 'ice' && peerRef.current && event.data) await peerRef.current.addIceCandidate(event.data as RTCIceCandidateInit).catch(()=>undefined);
      if (event.type === 'hangup') closeCall(false);
    });
    return () => { socket.disconnect(); socketRef.current = null; closeCall(false); setOnline(false); };
  }, [selected, client, closeCall]);

  const preparePeer = async () => {
    if (peerRef.current) return peerRef.current;
    const config = await apiFetch<RTCConfiguration>('/communications/rtc-config');
    const peer = new RTCPeerConnection(config);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.ontrack = event => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; setCallState('connected'); };
    peer.onicecandidate = event => { if (event.candidate) socketRef.current?.emit('call:signal', { conversationId: selected, type: 'ice', data: event.candidate.toJSON() }); };
    peerRef.current = peer; return peer;
  };
  const startCall = async () => { const peer=await preparePeer();const offer=await peer.createOffer();await peer.setLocalDescription(offer);socketRef.current?.emit('call:signal',{conversationId:selected,type:'offer',data:offer});setCallState('calling'); };
  const acceptCall = async () => { if(!incomingOffer)return;const peer=await preparePeer();await peer.setRemoteDescription(incomingOffer);const answer=await peer.createAnswer();await peer.setLocalDescription(answer);socketRef.current?.emit('call:signal',{conversationId:selected,type:'answer',data:answer});setIncomingOffer(null);setCallState('connected'); };
  const send = useMutation({
    mutationFn: () => new Promise((resolve, reject) => {
      const socket=socketRef.current;if(!socket?.connected){reject(new Error('El chat en tiempo real está desconectado'));return;}
      socket.timeout(8000).emit('message:send',{conversationId:selected,body,attachmentUrl:attachmentUrl||undefined},(error:Error|null,response:unknown)=>error?reject(error):resolve(response));
    }),
    onSuccess: async () => {
      setBody('');
      setAttachmentUrl('');
      await client.invalidateQueries({ queryKey: ['messages', selected] });
    },
  });
  const interviews = useQuery({
    queryKey: ['interviews'],
    queryFn: () => apiFetch<Interview[]>('/communications/interviews'),
  });
  const applications = useQuery({
    queryKey: ['interview-applications'],
    queryFn: () => apiFetch<Application[]>('/company/applications'),
    enabled: user?.role === 'COMPANY',
  });
  const [form, setForm] = useState({
    applicationId: '',
    startsAt: '',
    endsAt: '',
    timezone: 'America/Bogota',
    meetingUrl: '',
    location: '',
  });
  const schedule = useMutation({
    mutationFn: () =>
      apiFetch('/communications/interviews', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
  const changeInterview = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'CANCELLED' }) => apiFetch(`/communications/interviews/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['interviews'] }); },
  });
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<Notification[]>('/notifications'),
  });
  const read = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  if (mode === 'notifications')
    return (
      <div>
        <h1 className="text-3xl font-bold">Notificaciones</h1>
        <p className="mt-2 text-slate-600">Actividad relevante de tus procesos en ConekTa.</p>
        <div className="mt-7"><PushSettings /></div>
        <div className="space-y-3">
          {notifications.data?.map((n) => (
            <button
              key={n.id}
              onClick={() => read.mutate(n.id)}
              className={`block w-full rounded-2xl border p-5 text-left ${n.readAt ? 'bg-white' : 'border-rose-200 bg-rose-50'}`}
            >
              <strong>{n.title}</strong>
              <p className="mt-1 text-sm text-slate-600">{n.message}</p>
              <time className="mt-2 block text-xs text-slate-400">
                {new Date(n.createdAt).toLocaleString('es-CO')}
              </time>
            </button>
          ))}
          {!notifications.isLoading && !notifications.data?.length && (
            <p className="rounded-2xl border bg-white p-6 text-slate-500">
              No tienes notificaciones.
            </p>
          )}
        </div>
      </div>
    );
  if (mode === 'messages')
    return (
      <div>
        <h1 className="text-3xl font-bold">Chat de procesos</h1>
        <p className="mt-2 text-slate-600">
          Conversaciones privadas asociadas a tus postulaciones.
        </p>
        <div className="mt-8 grid min-h-[520px] overflow-hidden rounded-2xl border bg-white md:grid-cols-[300px_1fr]">
          <aside className="border-r">
            {conversations.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`block w-full border-b p-4 text-left ${selected === c.id ? 'bg-rose-50' : ''}`}
              >
                <strong className="text-sm">{c.application.vacancy.title}</strong>
                <p className="mt-1 text-xs text-slate-500">
                  {user?.role === 'CANDIDATE'
                    ? c.application.company.name
                    : `${c.application.candidate.firstName ?? ''} ${c.application.candidate.lastName ?? ''}`}
                </p>
              </button>
            ))}
            {!conversations.isLoading && !conversations.data?.length && (
              <p className="p-5 text-sm text-slate-500">
                Tus conversaciones aparecerán cuando tengas postulaciones.
              </p>
            )}
          </aside>
          <section className="flex flex-col">
            {selected && <div className="border-b p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className={`text-xs font-semibold ${online?'text-emerald-600':'text-slate-400'}`}>{online?'En línea':'Sin presencia activa'}</span><div className="flex gap-2">{callState==='idle'&&<Button type="button" size="sm" onClick={startCall}>Iniciar videollamada</Button>}{callState==='incoming'&&<Button type="button" size="sm" onClick={acceptCall}>Responder videollamada</Button>}{callState!=='idle'&&<Button type="button" size="sm" variant="outline" onClick={()=>closeCall()}>Colgar</Button>}</div></div>{callState!=='idle'&&<div className="mt-4 grid gap-3 sm:grid-cols-2"><video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full rounded-xl bg-slate-950 object-cover"/><video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-slate-900 object-cover"/></div>}</div>}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.data?.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${m.senderId === user?.id ? 'bg-primary ml-auto text-white' : 'bg-slate-100'}`}
                >
                  {m.body}
                  {m.attachmentUrl && <a className="mt-2 block underline" href={m.attachmentUrl} target="_blank" rel="noreferrer">Ver archivo adjunto</a>}
                </div>
              ))}
              {!selected && <p className="text-sm text-slate-500">Selecciona una conversación.</p>}
            </div>
            {selected && (
              <form
                className="space-y-3 border-t p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (body.trim()) send.mutate();
                }}
              >
                <FileUpload purpose="CHAT_ATTACHMENT" accept="image/png,image/jpeg,image/webp,application/pdf" onUploaded={setAttachmentUrl}/>
                <div className="flex gap-2"><Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Escribe un mensaje"/><Button disabled={send.isPending}>Enviar</Button></div>
              </form>
            )}
          </section>
        </div>
      </div>
    );
  return (
    <div>
      <h1 className="text-3xl font-bold">Agenda de entrevistas</h1>
      <p className="mt-2 text-slate-600">Fechas, enlaces y estado de tus entrevistas.</p>
      {user?.role === 'COMPANY' && (
        <form
          className="mt-7 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            schedule.mutate();
          }}
        >
          <select
            className="rounded-xl border p-3"
            value={form.applicationId}
            onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
          >
            <option value="">Postulación en entrevista</option>
            {applications.data
              ?.filter((a) => a.status === 'INTERVIEW')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.vacancy.title} — {a.candidate?.firstName}
                </option>
              ))}
          </select>
          <Input
            type="text"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="Zona horaria"
          />
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
          <Input
            value={form.meetingUrl}
            onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
            placeholder="URL de videollamada"
          />
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Lugar opcional"
          />
          <Button disabled={!form.applicationId || schedule.isPending}>Agendar entrevista</Button>
        </form>
      )}
      <div className="mt-7 grid gap-4">
        {interviews.data?.map((i) => (
          <article key={i.id} className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{i.application.vacancy.title}</h2>
                <p className="text-sm text-slate-500">
                  {new Date(i.startsAt).toLocaleString('es-CO')} — {i.timezone}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                {i.status}
              </span>
            </div>
              {i.meetingUrl && (
              <a
                className="text-primary mt-4 inline-block text-sm font-medium"
                href={i.meetingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir videollamada
              </a>
              )}
              {user?.role === 'COMPANY' && i.status === 'SCHEDULED' && <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={()=>changeInterview.mutate({id:i.id,status:'COMPLETED'})}>Marcar realizada</Button><Button size="sm" variant="ghost" onClick={()=>changeInterview.mutate({id:i.id,status:'CANCELLED'})}>Cancelar</Button></div>}
          </article>
        ))}
        {!interviews.isLoading && !interviews.data?.length && (
          <p className="rounded-2xl border bg-white p-6 text-slate-500">
            No hay entrevistas agendadas.
          </p>
        )}
      </div>
    </div>
  );
}
