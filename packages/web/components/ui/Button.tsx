// Componente Button con variantes del sistema de diseño — esquinas rectas
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
    'bg-primary text-on-primary hover:bg-primary-dim focus:ring-2 focus:ring-primary/30 font-semibold',
  secondary:
    'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant focus:ring-2 focus:ring-outline/20 font-medium',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus:ring-2 focus:ring-outline/20',
  icon: 'bg-transparent text-on-surface-variant hover:bg-surface-container p-2',
  danger:
    'bg-error text-white hover:bg-error/80 focus:ring-2 focus:ring-error/30 font-semibold',
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
        inline-flex items-center justify-center gap-2 transition-colors duration-150 outline-none font-body
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
