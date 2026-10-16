import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      aria-label="ConekTa, inicio"
      className={cn(
        'flex shrink-0 items-center justify-center',
        compact ? 'h-12 w-16' : 'h-16 w-44',
        className,
      )}
    >
      <img
        src={compact ? '/brand/conekta-icon.png' : '/brand/conekta-logo.png'}
        alt={compact ? 'Isotipo de ConekTa' : 'ConekTa — Tu talento merece una primera oportunidad'}
        className="block size-full object-contain"
      />
    </Link>
  );
}
