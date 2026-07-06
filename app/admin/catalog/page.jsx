import { fetchCatalogProducts } from '@/lib/catalog';
import CatalogClient from './CatalogClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Catálogo PDF',
  robots: { index: false, follow: false },
};

export default async function AdminCatalogPage() {
  const { rows, error } = await fetchCatalogProducts();
  return <CatalogClient products={rows} loadError={error} />;
}
