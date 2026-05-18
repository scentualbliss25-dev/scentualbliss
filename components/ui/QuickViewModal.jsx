'use client';
import { useQuickViewStore } from '@/lib/store/quickViewStore';
import QuickView from '@/components/ui/QuickView';

export default function QuickViewModal() {
  const product = useQuickViewStore((s) => s.product);
  const close = useQuickViewStore((s) => s.close);
  return <QuickView product={product} isOpen={!!product} onClose={close} />;
}
