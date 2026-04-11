// Componente wrapper de Material Symbols Outlined
interface IconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export function Icon({ name, className = '', size = 'md' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
