'use client';
import dynamic from 'next/dynamic';
import { useQuickViewStore } from '@/lib/store/quickViewStore';

// QuickView usa framer-motion. Carga diferida hasta que el usuario abre la vista rápida.
const QuickView = dynamic(() => import('@/components/ui/QuickView'), { ssr: false });

export default function QuickViewModal() {
  const product = useQuickViewStore((s) => s.product);
  const close = useQuickViewStore((s) => s.close);
  return <QuickView product={product} isOpen={!!product} onClose={close} />;
}
