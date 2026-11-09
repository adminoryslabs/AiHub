// Componente Button con variantes del design system
import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-orys-accent text-orys-fg-on-accent hover:bg-orys-accent-bright focus-visible:ring-2 focus-visible:ring-orys-line-brand font-semibold',
  secondary:
    'bg-orys-bg-raised text-orys-fg hover:bg-orys-bg-higher border border-orys-line focus-visible:ring-2 focus-visible:ring-orys-line-brand font-medium',
  ghost:
    'bg-transparent text-orys-fg-dim hover:bg-orys-bg-raised hover:text-orys-fg focus-visible:ring-2 focus-visible:ring-orys-line-brand',
  icon: 'bg-transparent text-orys-fg-dim hover:bg-orys-bg-raised p-2',
  danger:
    'bg-orys-fail text-orys-fg-on-accent hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orys-fail font-semibold',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-orys-xl transition-colors duration-150 outline-none font-orys-sans
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
