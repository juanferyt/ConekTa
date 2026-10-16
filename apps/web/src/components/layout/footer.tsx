import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';

const institutionalLinks = [
  { label: 'Verificar certificado', to: '/verify' },
  { label: 'Conócenos', to: '/conocenos' },
  { label: 'Aviso legal', to: '/aviso-legal' },
  { label: 'Política de privacidad', to: '/politica-de-privacidad' },
  { label: 'Política de cookies', to: '/politica-de-cookies' },
  { label: 'Términos y condiciones', to: '/terminos-y-condiciones' },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 text-slate-500">
      <div className="container space-y-8 text-sm">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <BrandLogo />
          <p className="text-center">Tu talento merece una primera oportunidad.</p>
          <p className="whitespace-nowrap">© {new Date().getFullYear()} ConekTa</p>
        </div>

        <div className="border-t border-slate-200 pt-6 text-center">
          <p className="font-medium text-slate-700">Todos los derechos reservados</p>
          <p className="mx-auto mt-3 max-w-3xl leading-6 text-slate-500">
            Juan Pablo Leal Usuga · Karen Yuliana Valencia Ochoa · Kelly Sandrith Diaz Bermudez ·
            Juan Fernando Murillo Mosquera
          </p>
          <nav
            className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-3"
            aria-label="Información institucional y legal"
          >
            {institutionalLinks.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-primary transition">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
