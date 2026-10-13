import { whatsappUrl } from '@/lib/checkout/whatsapp';
import { comoComprar } from './como-comprar';
import { preguntasFrecuentes } from './preguntas-frecuentes';
import { privacidad } from './privacidad';
import { sobre } from './sobre';
import { terminos } from './terminos';
import type { LegalContent } from './types';

export type { LegalContent, LegalSection } from './types';
export { comoComprar, preguntasFrecuentes, privacidad, sobre, terminos };

export interface LegalPageLink {
  path: `/${string}`;
  /** Short label for navigation (footer, sitemap). */
  label: string;
  content: LegalContent;
}

/** Legal and informational routes, in footer order. The sitemap can import this list. */
export const LEGAL_PAGES: readonly LegalPageLink[] = [
  { path: '/como-comprar', label: 'Cómo comprar', content: comoComprar },
  { path: '/preguntas-frecuentes', label: 'Preguntas frecuentes', content: preguntasFrecuentes },
  { path: '/sobre', label: 'Sobre Sale Enzo', content: sobre },
  { path: '/terminos', label: 'Términos y condiciones', content: terminos },
  { path: '/privacidad', label: 'Política de privacidad', content: privacidad },
];

/** Prefilled WhatsApp message for the "Contacto" links. */
export const CONTACT_MESSAGE = 'Hola, tengo una consulta sobre Sale Enzo.';

/** WhatsApp chat link for "Contacto", or null when NEXT_PUBLIC_WHATSAPP_NUMBER is not set. */
export const contactWhatsAppUrl = () => whatsappUrl(CONTACT_MESSAGE);
