import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [require('@adminoryslabs/design-system/tailwind-preset')],
  theme: {
    extend: {
      // Derivados de los tokens del design system (no son colores nuevos de paleta)
      colors: {
        'orys-accent-soft': 'color-mix(in srgb, var(--orys-accent) 12%, transparent)',
        'orys-bg-blur': 'color-mix(in srgb, var(--orys-bg) 85%, transparent)',
        'orys-scrim': 'color-mix(in srgb, var(--orys-bg) 66%, transparent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};

export default config;
