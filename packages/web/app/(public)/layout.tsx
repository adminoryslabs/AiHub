import { ReactNode } from 'react';
import { PopupHost } from '../../components/popups/PopupHost';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PopupHost />
    </>
  );
}
