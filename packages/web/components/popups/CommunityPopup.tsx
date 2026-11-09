'use client';

import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';

interface CommunityPopupProps {
  open: boolean;
  onClose: () => void;
}

// Primer popup: invitación a la comunidad (id: community-2026-06)
export function CommunityPopup({ open, onClose }: CommunityPopupProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="community-popup-title">
      <div className="px-8 pt-9 pb-8">
        <p className="font-orys-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-orys-accent mb-4">
          Novedad · Comunidad
        </p>
        <h2
          id="community-popup-title"
          className="font-orys-sans text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-orys-fg mb-3"
        >
          Únete a la comunidad
        </h2>
        <p className="text-[15.5px] leading-[1.55] text-orys-fg-dim mb-6">
          Resuelve dudas, comparte lo que aprendes y entérate primero de las nuevas guías.
          Cientos de personas explorando la IA generativa, sin humo.
        </p>
        <div className="flex flex-col gap-[10px]">
          <a
            href="https://discord.gg/xEEzEmaDf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-center gap-2 h-12 bg-orys-accent text-orys-fg-on-accent font-semibold text-[15px] no-underline hover:bg-orys-accent-bright"
          >
            <Icon name="forum" size="md" />
            Entrar al Discord
          </a>
          <button
            type="button"
            onClick={onClose}
            className="h-[42px] bg-transparent border border-orys-line text-orys-fg-dim text-[13.5px] font-medium hover:bg-orys-bg-raised"
          >
            Quizás más tarde
          </button>
        </div>
      </div>
    </Modal>
  );
}
