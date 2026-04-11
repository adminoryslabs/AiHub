// Componente Badge para estados, categorías y tipos
import { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'outline' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-error/10 text-error',
  outline: 'border border-outline-variant text-on-surface-variant',
  muted: 'bg-surface-container text-on-surface-variant',
};

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Badge de estado de artículo
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeVariant; label: string }> = {
    published: { variant: 'success', label: 'Publicado' },
    draft: { variant: 'muted', label: 'Borrador' },
    deprecated: { variant: 'error', label: 'Obsoleto' },
  };

  const { variant, label } = config[status] || { variant: 'muted', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
