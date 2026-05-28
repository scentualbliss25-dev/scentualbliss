import ContactPageClient from '@/components/pages/ContactPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Contacto — Atención al Cliente | ScentualBliss',
  description: 'Contáctanos para cualquier duda sobre tu pedido, fragancias o asesoría personalizada. Respondemos en menos de 24 horas.',
  alternates: { canonical: `${SITE_URL}/contacto` },
};

export default function ContactoPage() {
  return <ContactPageClient />;
}
