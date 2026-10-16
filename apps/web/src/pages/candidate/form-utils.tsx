import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="block text-sm font-medium text-slate-200">{label}<div className="mt-2">{children}</div>{error && <span className="mt-1 block text-xs text-red-300">{error}</span>}</label>; }
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input {...props} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none focus:border-primary" />; }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-primary" />; }
