import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#f5f6f8] px-5 py-12 text-foreground"><section className="w-full max-w-md"><div className="mb-8 flex justify-center"><BrandLogo className="h-16 w-52" /></div><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-35px_rgba(15,23,42,.3)] sm:p-9"><h1 className="text-3xl font-bold text-slate-950">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p><div className="mt-7">{children}</div><div className="mt-7 text-center text-sm text-slate-500">{footer}</div></div></section></main>;
}
