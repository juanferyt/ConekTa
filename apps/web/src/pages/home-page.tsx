import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, Puzzle, Search, Send, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';

const steps = [
  { icon: UserRound, title: 'Crea tu perfil', text: 'Regístrate, completa tu perfil y destaca tus habilidades y formación.', tone: 'rose' },
  { icon: Search, title: 'Descubre oportunidades', text: 'Explora ofertas pensadas para jóvenes como tú.', tone: 'green' },
  { icon: Puzzle, title: 'Conoce tu compatibilidad', text: 'Te mostramos las oportunidades que realmente encajan contigo.', tone: 'blue' },
  { icon: Send, title: 'Postúlate', text: 'Postúlate a las oportunidades que te interesan.', tone: 'amber' },
  { icon: CheckCircle2, title: 'Consigue tu oportunidad', text: 'Conecta con empresas que valoran tu talento y potencial.', tone: 'rose' },
];

export function HomePage() {
  return <div className="min-h-screen bg-white text-[#172033]">
    <Navbar />
    <main>
      <section className="relative overflow-hidden pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_73%_42%,rgba(239,84,104,.13),transparent_28%),radial-gradient(circle_at_82%_52%,rgba(255,211,217,.45),transparent_25%)]" />
        <div className="container relative grid min-h-[620px] items-center gap-8 py-14 lg:grid-cols-[.88fr_1.12fr] lg:py-16">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-bold text-primary"><Sparkles className="size-3.5" /> Tu futuro empieza aquí</span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-.045em] sm:text-6xl">Tu talento merece <span className="text-primary">una primera oportunidad</span></h1>
            <p className="mt-6 max-w-lg text-[17px] leading-7 text-slate-600">ConeKTa conecta tu talento, habilidades y potencial con empresas que creen en los jóvenes profesionales.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-lg px-6 shadow-[0_10px_25px_-12px_rgba(224,70,91,.8)]"><Link to="/register?role=CANDIDATE"><UserRound className="mr-2 size-4" />Crear mi perfil</Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-slate-200 px-6"><Link to="/register?role=COMPANY"><BriefcaseBusiness className="mr-2 size-4" />Publicar una oportunidad</Link></Button>
            </div>
            <div className="mt-8 flex items-center gap-5 text-xs text-slate-500"><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" />Gratis para candidatos</span><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" />Perfil en minutos</span></div>
          </div>
          <div className="relative mx-auto h-[480px] w-full max-w-[650px] lg:h-[540px]">
            <div className="absolute inset-x-[9%] bottom-3 top-10 rounded-[48%_48%_28%_28%/40%_40%_20%_20%] bg-gradient-to-br from-rose-50 via-[#fff5f6] to-[#fbdde2]" />
            <img src="/brand/hero-young-professionals.png" alt="Jóvenes profesionales listos para su primera oportunidad" className="absolute bottom-0 left-1/2 h-[96%] max-w-none -translate-x-1/2 object-contain mix-blend-multiply" />
            <FloatingCard className="left-0 top-[31%]" icon={<BarChart3 className="size-5" />} label="Perfil destacado" />
            <FloatingCard className="right-1 top-[22%]" icon={<Search className="size-5" />} label="Nuevas vacantes" />
            <FloatingCard className="right-0 top-[60%]" icon={<CheckCircle2 className="size-5" />} label="92% compatible" />
            <div className="absolute bottom-5 left-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur"><p className="text-[11px] font-medium text-slate-400">Oportunidades para ti</p><p className="mt-1 text-sm font-bold text-slate-800">12 nuevas coincidencias</p></div>
          </div>
        </div>
      </section>
      <section id="como-funciona" className="border-y border-slate-100 bg-[#fffafa] py-16">
        <div className="container"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Simple y transparente</p><h2 className="mt-3 text-3xl font-bold tracking-tight">¿Cómo funciona?</h2></div>
          <div className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5"><div className="absolute left-[9%] right-[9%] top-8 hidden border-t border-dashed border-slate-300 lg:block" />{steps.map(({ icon: Icon, title, text, tone }, index) => <article key={title} className="relative text-center"><div className={`step-icon step-icon-${tone}`}><Icon className="size-6" /></div><span className="absolute left-[calc(50%+22px)] top-0 grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-slate-400 shadow">{index + 1}</span><h3 className="mt-5 text-sm font-bold">{title}</h3><p className="mx-auto mt-2 max-w-[190px] text-xs leading-5 text-slate-500">{text}</p></article>)}</div>
        </div>
      </section>
      <section className="py-20"><div className="container grid gap-6 md:grid-cols-2"><Audience id="talento" label="Para jóvenes" title="Convierte tu potencial en una carrera" text="Crea un perfil que muestre lo que sabes hacer y encuentra empresas dispuestas a darte esa primera oportunidad." action="Crear perfil profesional" href="/register?role=CANDIDATE" /><Audience id="empresas" label="Para empresas" title="Descubre talento antes que experiencia" text="Publica oportunidades, compara perfiles por habilidades y construye procesos de selección más humanos." action="Registrar mi empresa" href="/register?role=COMPANY" /></div></section>
    </main>
    <Footer />
  </div>;
}

function FloatingCard({ className, icon, label }: { className: string; icon: React.ReactNode; label: string }) { return <div className={`absolute flex items-center gap-2 rounded-xl border border-white bg-white/95 p-3 text-primary shadow-[0_12px_35px_-15px_rgba(20,27,45,.28)] ${className}`}><span className="grid size-9 place-items-center rounded-lg bg-rose-50">{icon}</span><span className="hidden pr-1 text-xs font-semibold text-slate-700 sm:block">{label}</span></div>; }
function Audience({ id, label, title, text, action, href }: { id: string; label: string; title: string; text: string; action: string; href: string }) { return <article id={id} className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-[#fbfbfc] p-8 sm:p-10"><div className="absolute -right-16 -top-16 size-44 rounded-full bg-rose-100/60 transition group-hover:scale-110" /><p className="relative text-xs font-bold uppercase tracking-[.16em] text-primary">{label}</p><h2 className="relative mt-3 max-w-md text-3xl font-bold tracking-tight">{title}</h2><p className="relative mt-4 max-w-lg text-sm leading-6 text-slate-600">{text}</p><Link to={href} className="relative mt-7 inline-flex items-center text-sm font-bold text-primary">{action}<ArrowRight className="ml-2 size-4" /></Link></article>; }
