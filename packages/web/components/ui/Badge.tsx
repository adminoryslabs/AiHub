// Componente Badge para estados, categorías y tipos
import { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'outline' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-orys-accent text-orys-fg-on-accent',
  success: 'bg-orys-accent-soft text-orys-accent',
  warning: 'border border-orys-line text-orys-fg-dim',
  error: 'border border-orys-fail text-orys-fail',
  outline: 'border border-orys-line text-orys-fg-dim',
  muted: 'text-orys-fg-dim',
};

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-orys-mono text-[10.5px] font-medium tracking-[0.06em] px-2 py-0.5 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Badge de estado de artículo
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeVariant; label: string }> = {
    published: { variant: 'success', label: 'publicado' },
    in_review: { variant: 'warning', label: 'en revisión' },
    draft: { variant: 'muted', label: 'borrador' },
    deprecated: { variant: 'error', label: 'obsoleto' },
  };

  const { variant, label } = config[status] || { variant: 'muted' as BadgeVariant, label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
