import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Migas de pan" className="breadcrumbs">
      <ol className="breadcrumbs-list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.url} className="breadcrumbs-item">
              {last ? (
                <span aria-current="page" className="breadcrumbs-current">{item.name}</span>
              ) : (
                <>
                  <Link href={item.url} className="breadcrumbs-link">{item.name}</Link>
                  <ChevronRight size={12} aria-hidden="true" className="breadcrumbs-sep" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
