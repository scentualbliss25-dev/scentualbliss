import FaqPageClient from '@/components/pages/FaqPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Preguntas Frecuentes — Envíos, Devoluciones y Productos | ScentualBliss',
  description: 'Encuentra respuestas sobre envíos, devoluciones, tiempos de entrega y todo sobre nuestras fragancias de lujo.',
  alternates: { canonical: `${SITE_URL}/faq` },
};

export default function FaqPage() {
  return <FaqPageClient />;
}
