import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary px-6 py-3 text-primary-foreground shadow-sm hover:bg-primary/90',
        outline: 'border border-slate-300 bg-white px-6 py-3 text-slate-800 hover:bg-slate-50',
        ghost: 'px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
      },
      size: { default: 'h-12', sm: 'h-10 px-4', lg: 'h-14 px-7 text-base' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
