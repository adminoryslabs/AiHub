// Bloque Comunidad — aislado para reubicarlo fácil en próximas iteraciones
import { Icon } from '../ui/Icon';
import type { SupportedLang } from '@/lib/i18n';

interface CommunityCardProps {
  lang: SupportedLang;
}

const COPY = {
  es: {
    title: 'Comunidad',
    body: 'Aprende y comparte con otros que están explorando la IA.',
    discord: 'Discord',
    oryslabs: 'OrysLabs',
  },
  en: {
    title: 'Community',
    body: 'Learn and share with others exploring AI.',
    discord: 'Discord',
    oryslabs: 'OrysLabs',
  },
} as const;

export function CommunityCard({ lang }: CommunityCardProps) {
  const t = COPY[lang];

  return (
    <div className="border border-orys-line bg-orys-bg p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-1.5 h-1.5 bg-orys-accent flex-shrink-0" aria-hidden="true" />
        <p className="font-orys-sans font-semibold text-[15px] tracking-tight text-orys-fg">
          {t.title}
        </p>
      </div>
      <p className="text-[12.5px] leading-snug text-orys-fg-dim mb-3">
        {t.body}
      </p>
      <div className="flex flex-col gap-1.5">
        <a
          href="https://discord.gg/xEEzEmaDf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2.5 py-2 bg-orys-bg-raised border border-orys-line text-sm font-semibold text-orys-fg hover:bg-orys-bg-higher transition-colors"
        >
          <Icon name="forum" className="text-[18px] text-orys-accent" />
          <span>{t.discord}</span>
          <Icon name="arrow_outward" className="ml-auto text-[16px] text-orys-fg-dim" />
        </a>
        <a
          href="https://oryslabs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2.5 py-2 bg-orys-bg-raised border border-orys-line text-sm font-semibold text-orys-fg hover:bg-orys-bg-higher transition-colors"
        >
          <Icon name="hub" className="text-[18px] text-orys-accent" />
          <span>{t.oryslabs}</span>
          <Icon name="arrow_outward" className="ml-auto text-[16px] text-orys-fg-dim" />
        </a>
      </div>
    </div>
  );
}
