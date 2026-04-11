// Ruta raíz: redirige al idioma preferido del usuario
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { detectLanguage } from '@/lib/i18n';

export default async function RootPage() {
  // Detectar idioma preferido del header Accept-Language
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const lang = detectLanguage(acceptLanguage);

  redirect(`/${lang}`);
}
