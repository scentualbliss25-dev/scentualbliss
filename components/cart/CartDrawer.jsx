'use client';
import { useEffect } from 'react';
import { X, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cartStore';

const FREE_SHIPPING = 350000;
const SHIPPING_FEE = 15000;
const COP = (n) => 'COP $' + Number(n || 0).toLocaleString('es-CO');

export default function CartDrawer() {
  const { items: rawItems, isOpen, closeCart, removeItem, updateQuantity } = useCartStore();
  // Defensa: localStorage corrupto puede dar items undefined/null. Garantizamos array.
  const items = Array.isArray(rawItems) ? rawItems : [];
  const subtotal = items.reduce((s, i) => s + (i?.price || 0) * (i?.quantity || 0), 0);
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const progress = Math.min(100, subtotal === 0 ? 0 : (subtotal / FREE_SHIPPING) * 100);
  const count = items.reduce((s, i) => s + (i?.quantity || 0), 0);
  const shipping = subtotal > 0 && remaining === 0 ? 0 : (subtotal > 0 ? SHIPPING_FEE : 0);
  const total = subtotal + shipping;

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) closeCart(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <>
      <div className="sb-cart-overlay" onClick={closeCart} />
      <aside className="sb-cart" role="dialog" aria-label="Carrito">
        <div className="sb-cart-head">
          <h3>Carrito ({count})</h3>
          <button className="sb-cart-close" onClick={closeCart} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="sb-cart-body">
          {items.length === 0 ? (
            <div className="sb-cart-empty">
              <div className="sb-cart-empty-icon"><ShoppingBag size={28} /></div>
              <p>Tu carrito está vacío.</p>
              <Link href="/tienda" onClick={closeCart} className="sb-cart-empty-cta">
                Seguir explorando
              </Link>
            </div>
          ) : (
            items.map((it) => (
              <div key={it.key} className="sb-cart-item">
                <div className="sb-cart-item-img">
                  <img
                    src={it.images?.[0] || `/img/${it.slug}.webp`}
                    alt={it.name}
                    onError={(e) => { e.currentTarget.src = '/img/placeholder-perfume.webp'; }}
                  />
                </div>
                <div className="sb-cart-item-info">
                  <p className="sb-cart-item-brand">{it.brand}</p>
                  <p className="sb-cart-item-name">{it.name}</p>
                  <p className="sb-cart-item-size">{it.selectedSize}{it.type ? ' · ' + it.type : ''}</p>
                  <div className="sb-cart-item-bottom">
                    <div className="sb-qty">
                      <button onClick={() => updateQuantity(it.key, Math.max(1, it.quantity - 1))} disabled={it.quantity <= 1} aria-label="Disminuir">
                        <Minus size={12} />
                      </button>
                      <span>{it.quantity}</span>
                      <button onClick={() => updateQuantity(it.key, it.quantity + 1)} aria-label="Aumentar">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="sb-cart-item-price">{COP(it.price * it.quantity)}</span>
                  </div>
                  <button className="sb-cart-item-remove" onClick={() => removeItem(it.key)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="sb-cart-foot">
            <div className="sb-shipping-bar">
              <div style={{ width: `${progress}%` }} />
            </div>
            {remaining > 0 ? (
              <p className="sb-shipping-msg">Te faltan <b>{COP(remaining)}</b> para envío gratis</p>
            ) : (
              <p className="sb-shipping-msg unlocked">¡Conseguiste envío gratis! 🎉</p>
            )}
            <div className="sb-cart-line"><span>Subtotal</span><span>{COP(subtotal)}</span></div>
            <div className="sb-cart-line">
              <span>Envío</span>
              <span className={remaining === 0 ? 'unlocked' : ''}>{remaining === 0 ? 'Gratis' : COP(shipping)}</span>
            </div>
            <div className="sb-cart-line total"><span>Total</span><span>{COP(total)}</span></div>
            <Link href="/checkout" onClick={closeCart} className="sb-cart-checkout">
              Pagar ahora <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <style>{`
          .sb-cart-overlay {
            position: fixed; inset: 0;
            background: rgba(15, 12, 9, .55);
            backdrop-filter: blur(6px);
            z-index: 100;
            animation: sb-cart-fade .25s cubic-bezier(.22,.61,.36,1);
          }
          @keyframes sb-cart-fade { from { opacity: 0; } to { opacity: 1; } }
          .sb-cart {
            position: fixed; right: 0; top: 0; bottom: 0;
            width: min(460px, 100vw);
            background: #FDFBF7;
            z-index: 110;
            display: flex; flex-direction: column;
            animation: sb-cart-slide .35s cubic-bezier(.16,1,.3,1);
            box-shadow: -20px 0 60px rgba(31,26,20,.18);
            font-family: var(--font-sans);
            color: #1F1A14;
          }
          @keyframes sb-cart-slide { from { transform: translateX(100%); } to { transform: none; } }
          .sb-cart-head {
            display: flex; justify-content: space-between; align-items: center;
            padding: 24px 28px;
            border-bottom: 1px solid rgba(31, 26, 20, 0.10);
          }
          .sb-cart-head h3 {
            font-family: var(--font-serif);
            font-size: 1.4rem;
            font-weight: 500;
            color: #1F1A14;
            margin: 0;
            letter-spacing: -.01em;
          }
          .sb-cart-close {
            width: 36px; height: 36px;
            border-radius: 50%;
            background: #F5EFE3;
            display: flex; align-items: center; justify-content: center;
            color: #1F1A14;
            border: 0; cursor: pointer;
            transition: all .2s;
          }
          .sb-cart-close:hover { background: #1F1A14; color: #FDFBF7; }

          .sb-cart-body {
            flex: 1; overflow-y: auto;
            padding: 16px 28px;
          }
          .sb-cart-empty {
            text-align: center;
            padding: 60px 20px;
            color: #7A6E5E;
          }
          .sb-cart-empty-icon {
            width: 70px; height: 70px;
            border-radius: 50%;
            background: #F5EFE3;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 18px;
            color: #8C6A40;
          }
          .sb-cart-empty p {
            margin: 0 0 22px 0;
            font-size: .95rem;
            color: #7A6E5E;
          }
          .sb-cart-empty-cta {
            display: inline-flex; align-items: center; gap: 9px;
            padding: 10px 20px;
            border: 1px solid #1F1A14;
            color: #1F1A14;
            border-radius: 100px;
            font-size: .72rem;
            font-weight: 500;
            letter-spacing: .12em;
            text-transform: uppercase;
            transition: all .25s;
          }
          .sb-cart-empty-cta:hover {
            background: #1F1A14;
            color: #FDFBF7;
          }

          .sb-cart-item {
            display: flex; gap: 14px;
            padding: 18px 0;
            border-bottom: 1px solid rgba(31, 26, 20, 0.05);
          }
          .sb-cart-item:last-child { border-bottom: 0; }
          .sb-cart-item-img {
            width: 80px;
            aspect-ratio: 1/1;
            background: #FAF6EE;
            border-radius: 4px;
            overflow: hidden;
            flex-shrink: 0;
          }
          .sb-cart-item-img img {
            width: 100%; height: 100%;
            object-fit: contain;
            padding: 6%;
            mix-blend-mode: multiply;
            display: block;
          }
          .sb-cart-item-info { flex: 1; min-width: 0; }
          .sb-cart-item-brand {
            font-size: .65rem;
            letter-spacing: .22em;
            text-transform: uppercase;
            color: #7A6E5E;
            font-weight: 500;
            margin: 0 0 2px 0;
          }
          .sb-cart-item-name {
            font-family: var(--font-serif);
            font-size: 1.05rem;
            line-height: 1.2;
            margin: 0 0 4px 0;
            color: #1F1A14;
            font-weight: 500;
          }
          .sb-cart-item-size {
            font-size: .76rem;
            color: #7A6E5E;
            margin: 0 0 10px 0;
          }
          .sb-cart-item-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
          .sb-qty {
            display: inline-flex;
            align-items: center;
            border: 1px solid rgba(31, 26, 20, 0.10);
            border-radius: 100px;
            overflow: hidden;
          }
          .sb-qty button {
            width: 36px; height: 36px;
            display: inline-flex; align-items: center; justify-content: center;
            background: transparent;
            border: 0;
            cursor: pointer;
            color: #1F1A14;
            transition: all .2s;
          }
          .sb-qty button:hover:not(:disabled) { background: #F5EFE3; }
          .sb-qty button:disabled { opacity: .35; cursor: not-allowed; }
          .sb-qty span {
            padding: 0 12px;
            font-size: .85rem;
            font-weight: 600;
            min-width: 32px;
            text-align: center;
            color: #1F1A14;
          }
          @media (max-width: 640px) {
            .sb-qty button { width: 44px; height: 44px; }
            .sb-qty span { padding: 0 14px; min-width: 36px; font-size: .92rem; }
          }
          .sb-cart-item-price {
            font-size: .9rem;
            font-weight: 600;
            color: #1F1A14;
          }
          .sb-cart-item-remove {
            font-size: .7rem;
            color: #7A6E5E;
            margin-top: 8px;
            background: none; border: 0; padding: 0;
            text-decoration: underline;
            text-underline-offset: 2px;
            cursor: pointer;
            transition: color .2s;
          }
          .sb-cart-item-remove:hover { color: #C77A7A; }

          .sb-cart-foot {
            padding: 22px 28px 28px;
            border-top: 1px solid rgba(31, 26, 20, 0.10);
            background: #FAF6EE;
          }
          .sb-shipping-bar {
            height: 4px;
            background: #F5EFE3;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .sb-shipping-bar > div {
            height: 100%;
            background: linear-gradient(90deg, #B8905C 0%, #8C6A40 100%);
            transition: width .4s cubic-bezier(.22,.61,.36,1);
          }
          .sb-shipping-msg {
            font-size: .76rem;
            color: #4A3F33;
            margin: 0 0 14px 0;
          }
          .sb-shipping-msg b { color: #1F1A14; font-weight: 600; }
          .sb-shipping-msg.unlocked {
            color: #4A6B5C;
            font-weight: 600;
          }
          .sb-cart-line {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: .9rem;
            color: #4A3F33;
          }
          .sb-cart-line .unlocked { color: #4A6B5C; font-weight: 600; }
          .sb-cart-line.total {
            font-weight: 600;
            font-size: 1.05rem;
            color: #1F1A14;
            padding-top: 14px;
            margin-top: 6px;
            border-top: 1px solid rgba(31, 26, 20, 0.10);
          }
          .sb-cart-checkout {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            width: 100%;
            margin-top: 18px;
            padding: 17px 26px;
            border-radius: 100px;
            background: #1F1A14;
            color: #FDFBF7;
            font-size: .85rem;
            font-weight: 500;
            letter-spacing: .04em;
            text-transform: uppercase;
            transition: all .35s cubic-bezier(.22,.61,.36,1);
          }
          .sb-cart-checkout:hover {
            background: #2A2218;
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(31, 26, 20, .18);
          }
        `}</style>
      </aside>
    </>
  );
}
