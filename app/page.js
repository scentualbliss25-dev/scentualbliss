import HomePageClient from '@/components/pages/HomePageClient';
import { getAllProducts } from '@/lib/products';

export const metadata = {
  title: 'ScentualBliss — Perfumería Original | Fragancias Exclusivas',
  description: 'Descubre fragancias únicas orientales, florales y amaderadas. Perfumes de lujo con envío gratis a toda Colombia. Dior Sauvage, Creed Aventus, Lattafa Khamrah, Tom Ford y más.',
};

export default async function HomePage() {
  // Cargamos el catálogo en server-side (con cache) y se lo pasamos al
  // client component. El cliente no consulta la DB directamente.
  const products = await getAllProducts();
  return <HomePageClient products={products} />;
}
