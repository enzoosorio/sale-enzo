import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { preguntasFrecuentes as content } from '@/content/legal';

export const metadata: Metadata = { title: content.title, description: content.description };

export default function Page() {
  return <LegalPage content={content} eyebrow="Sale Enzo / Ayuda" />;
}
