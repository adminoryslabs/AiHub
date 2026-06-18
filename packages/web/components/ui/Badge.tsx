// Componente Badge para estados, categorías y tipos — estilo terminal `[etiqueta]`
import { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'outline' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary text-on-primary',
  success: 'text-on-surface-variant',
  warning: 'border border-outline-variant text-on-surface-variant',
  error: 'border border-error/40 text-error',
  outline: 'border border-outline-variant text-on-surface-variant',
  muted: 'text-on-surface-variant',
};

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[11px] tracking-wide rounded-sm ${VARIANT_CLASSES[variant]} ${className}`}
    >
      [{children}]
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
