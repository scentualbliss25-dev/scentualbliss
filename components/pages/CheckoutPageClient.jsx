'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock, CreditCard, ArrowLeft, CheckCircle, ChevronDown, Truck, RotateCcw,
  Shield, Clock, Building2, MessageCircle,
  Award, Star,
} from 'lucide-react';
import { PageTransition } from '@/components/ui/ScrollAnimations';
import { useCartStore, useCartTotal } from '@/lib/store/cartStore';
import { formatCOP } from '@/lib/format';

const FREE_SHIPPING_THRESHOLD = 350000; // COP
const SHIPPING_COST = 15000; // COP
const PHONE_WHATSAPP = '573169376436';

const steps = ['Información', 'Pago'];

// Métodos de pago recomendados para e-commerce de lujo en Colombia
// Wompi Widget maneja todos los métodos internamente, este listado es solo informativo
const PAYMENT_METHODS = [
  { id: 'card', label: 'Tarjeta de crédito / débito', icon: CreditCard, desc: 'Visa, Mastercard, AMEX, Diners' },
  { id: 'pse',  label: 'PSE',                          icon: Building2,  desc: 'Transferencia bancaria en línea' },
];

// Countdown urgencia: 15 minutos para reservar el pedido
const RESERVATION_MINUTES = 15;

export default function CheckoutPageClient() {
  const { items: rawItems, clearCart } = useCartStore();
  // Defensa: localStorage corrupto puede dar items undefined. Garantizamos array
  // para evitar que items.length / .map / .reduce revienten.
  const items = Array.isArray(rawItems) ? rawItems : [];
  const total = useCartTotal();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', addressDetail: '',
    city: '', department: '', zip: '', country: 'CO',
  });
  const [errors, setErrors] = useState({});
  // Wompi muestra todos los métodos disponibles en su pasarela; este campo es solo
  // para registro nuestro de la orden.
  const [paymentMethod] = useState('wompi');
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Reserva timer
  const [secondsLeft, setSecondsLeft] = useState(RESERVATION_MINUTES * 60);
  // Viewers fake
  const [viewers, setViewers] = useState(8);
  // Last purchase ticker
  const [lastPurchase, setLastPurchase] = useState(null);

  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    const tick = () => {
      setViewers(v => Math.max(3, Math.min(18, v + (Math.random() < 0.5 ? -1 : 1))));
    };
    const i = setInterval(tick, 5000);
    return () => clearInterval(i);
  }, []);

  // Mock "compraron recientemente"
  useEffect(() => {
    if (!items.length) return;
    const NAMES = ['María en Bogotá', 'Carlos en Medellín', 'Valentina en Cali', 'Andrés en Barranquilla', 'Laura en Cartagena', 'Sofía en Bucaramanga'];
    const showRandom = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      setLastPurchase(name);
      setTimeout(() => setLastPurchase(null), 5000);
    };
    const t1 = setTimeout(showRandom, 8000);
    const t2 = setInterval(showRandom, 22000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [items.length]);

  const discount = couponApplied ? total * 0.15 : 0;
  const subtotalAfterDiscount = total - discount;
  const shipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const grand = subtotalAfterDiscount + shipping;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalAfterDiscount);

  // Format minutes:seconds
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  const handleCoupon = () => {
    if (coupon.trim().toUpperCase() === 'BLISS15') {
      setCouponApplied(true);
      setCouponError('');
    } else {
      setCouponError('Código no válido o expirado');
    }
  };

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  // Validación inline por step
  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = 'Ingresa tu nombre completo';
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Email no válido';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 7) e.phone = 'Teléfono no válido';
    if (!form.address.trim()) e.address = 'Ingresa tu dirección';
    if (!form.city.trim()) e.city = 'Ingresa tu ciudad';
    if (!form.department.trim()) e.department = 'Ingresa tu departamento';
    return e;
  };
  const validateStep1 = () => ({});

  const handleNext = (e) => {
    e?.preventDefault?.();
    const stepErrors = step === 0 ? validateStep0() : validateStep1();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      // Scroll al primer error
      setTimeout(() => {
        const first = document.querySelector('[data-error="true"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handlePay();
    }
  };

  const handlePay = async () => {
    // Todos los métodos → Wompi Web Checkout
    setLoading(true);
    try {
      const res = await fetch('/api/wompi/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: grand, // COP value — toAmountInCents lo multiplica x100
          discount,
          shippingCost: shipping,
          items,
          customer: { email: form.email, name: form.name, phone: form.phone },
          shipping: {
            address: `${form.address}${form.addressDetail ? ', ' + form.addressDetail : ''}`,
            city: form.city,
            department: form.department,
            country: form.country,
          },
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Si Wompi no está configurado, fallback a checkout simulado
        if (res.status === 503) {
          console.warn('[Wompi] no configurado, usando flujo simulado');
          await new Promise(r => setTimeout(r, 1500));
          clearCart();
          const orderId = 'SB-' + Date.now().toString(36).toUpperCase();
          router.push(`/order-confirm?orderId=${orderId}&total=${grand}&simulated=1`);
          return;
        }
        throw new Error(data.error || 'Error al iniciar el pago');
      }
      // Redirigir a Wompi (el carrito se limpia al volver con éxito)
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('[Checkout error]', err);
      alert('No se pudo procesar el pago. Intenta de nuevo o contáctanos por WhatsApp.');
      setLoading(false);
    }
  };

  if (items.length === 0) return (
    <PageTransition>
      <div style={{ textAlign: 'center', padding: '120px 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '16px' }}>Tu carrito está vacío</h2>
        <p style={{ color: 'var(--gray)', marginBottom: '24px' }}>Descubre nuestras fragancias y empieza a llenarlo.</p>
        <Link href="/tienda" className="btn btn-primary">Explorar Tienda</Link>
      </div>
    </PageTransition>
  );

  // === Componente: badge de input ===
  const inputClass = () => 'input';
  const errBox = (field) => errors[field] && (
    <p data-error="true" style={{ fontSize: '.75rem', color: 'var(--error)', marginTop: '4px', fontWeight: 500 }}>
      {errors[field]}
    </p>
  );

  return (
    <PageTransition>
    <main style={{ minHeight: '80vh', padding: '32px 0 120px' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>

        {/* HEADER simplificado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href="/tienda" style={{ color: 'var(--gray)', transition: 'color .2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.85rem' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}>
            <ArrowLeft size={16} /> Seguir comprando
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray)', fontSize: '.78rem' }}>
              <Lock size={13} style={{ color: 'var(--success)' }} /> SSL 256-bit
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray)', fontSize: '.78rem' }}>
              <Shield size={13} style={{ color: 'var(--gold)' }} /> Pago Seguro
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray)', fontSize: '.78rem' }}>
              <Award size={13} style={{ color: 'var(--gold)' }} /> 100% Original
            </div>
          </div>
        </div>

        {/* TITLE + URGENCY BANNER */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '14px 20px', borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(201,169,110,.10), rgba(201,169,110,.04))',
          border: '1px solid rgba(201,169,110,.30)',
          marginBottom: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} style={{ color: 'var(--gold)' }} />
            <p style={{ fontSize: '.88rem', color: 'var(--white)', fontWeight: 600 }}>
              Tu pedido está reservado por <strong style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: '1rem' }}>{mm}:{ss}</strong>
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 1.5s ease infinite' }} />
            <p style={{ fontSize: '.82rem', color: 'var(--gray-light)' }}>
              <strong style={{ color: 'var(--white)' }}>{viewers}</strong> personas comprando ahora
            </p>
          </div>
        </div>

        {/* PROGRESS STEPS */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '32px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0' }}>
              <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: i < step ? 'pointer' : 'default',
                  background: 'none', border: 'none', padding: 0,
                }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', border: '2px solid',
                  borderColor: i <= step ? 'var(--gold)' : 'var(--dark-4)',
                  background: i < step ? 'var(--gold)' : i === step ? 'rgba(201,169,110,.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i < step ? '#1F1A12' : i === step ? 'var(--gold-dark)' : 'var(--gray)',
                  fontSize: '.85rem', fontWeight: 700, transition: 'all .3s',
                }}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: '.82rem', fontWeight: 600, color: i === step ? 'var(--white)' : 'var(--gray)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{s}</span>
              </button>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--gold)' : 'var(--dark-4)', margin: '0 12px', transition: 'background .3s' }} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }} className="checkout-grid">
          <form onSubmit={handleNext}>

            {/* === PASO 0: Datos + Envío UNIFICADOS === */}
            {step === 0 && (
              <div style={{ animation: 'slideUp .25s ease' }}>
                {/* Contacto */}
                <div style={{ background: 'var(--dark-2)', borderRadius: '14px', border: '1px solid var(--dark-4)', padding: '24px', marginBottom: '20px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '6px', fontSize: '1.3rem' }}>Datos de Contacto</h3>
                  <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '20px' }}>Te enviaremos confirmación y seguimiento por estos medios.</p>
                  <div className="form-group">
                    <label>Email <span style={{ color: 'var(--gold)' }}>*</span></label>
                    <input required type="email" autoComplete="email" inputMode="email"
                      value={form.email} onChange={e => setField('email', e.target.value)}
                      className={inputClass('email')} placeholder="tu@email.com"
                      data-error={!!errors.email} />
                    {errBox('email')}
                  </div>
                  <div className="grid-2" style={{ gap: '14px' }}>
                    <div className="form-group">
                      <label>Nombre completo <span style={{ color: 'var(--gold)' }}>*</span></label>
                      <input required autoComplete="name" value={form.name} onChange={e => setField('name', e.target.value)}
                        className={inputClass('name')} placeholder="Ana García" data-error={!!errors.name} />
                      {errBox('name')}
                    </div>
                    <div className="form-group">
                      <label>WhatsApp <span style={{ color: 'var(--gold)' }}>*</span></label>
                      <input required autoComplete="tel" inputMode="tel" type="tel"
                        value={form.phone} onChange={e => setField('phone', e.target.value)}
                        className={inputClass('phone')} placeholder="+57 300 123 4567"
                        data-error={!!errors.phone} />
                      {errBox('phone')}
                    </div>
                  </div>
                </div>

                {/* Envío */}
                <div style={{ background: 'var(--dark-2)', borderRadius: '14px', border: '1px solid var(--dark-4)', padding: '24px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '6px', fontSize: '1.3rem' }}>Dirección de Envío</h3>
                  <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '20px' }}>📦 Envío gratis a toda Colombia.</p>
                  <div className="form-group">
                    <label>Dirección <span style={{ color: 'var(--gold)' }}>*</span></label>
                    <input required autoComplete="street-address" value={form.address} onChange={e => setField('address', e.target.value)}
                      className={inputClass('address')} placeholder="Calle 100 #15-20" data-error={!!errors.address} />
                    {errBox('address')}
                  </div>
                  <div className="form-group">
                    <label>Apartamento, oficina, referencia (opcional)</label>
                    <input autoComplete="address-line2" value={form.addressDetail} onChange={e => setField('addressDetail', e.target.value)}
                      className="input" placeholder="Apto 304, torre B" />
                  </div>
                  <div className="grid-2" style={{ gap: '14px' }}>
                    <div className="form-group">
                      <label>Ciudad <span style={{ color: 'var(--gold)' }}>*</span></label>
                      <input required autoComplete="address-level2" value={form.city} onChange={e => setField('city', e.target.value)}
                        className={inputClass('city')} placeholder="Bogotá" data-error={!!errors.city} />
                      {errBox('city')}
                    </div>
                    <div className="form-group">
                      <label>Departamento <span style={{ color: 'var(--gold)' }}>*</span></label>
                      <input required autoComplete="address-level1" value={form.department} onChange={e => setField('department', e.target.value)}
                        className={inputClass('department')} placeholder="Cundinamarca" data-error={!!errors.department} />
                      {errBox('department')}
                    </div>
                  </div>
                  <div className="grid-2" style={{ gap: '14px' }}>
                    <div className="form-group">
                      <label>Código Postal (opcional)</label>
                      <input autoComplete="postal-code" inputMode="numeric" value={form.zip} onChange={e => setField('zip', e.target.value)}
                        className="input" placeholder="110111" />
                    </div>
                    <div className="form-group">
                      <label>País <span style={{ color: 'var(--gold)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <select autoComplete="country" value={form.country} onChange={e => setField('country', e.target.value)} className="input" style={{ appearance: 'none', paddingRight: '36px' }}>
                          <option value="CO">🇨🇴 Colombia</option>
                          <option value="MX">🇲🇽 México</option>
                          <option value="AR">🇦🇷 Argentina</option>
                          <option value="ES">🇪🇸 España</option>
                          <option value="US">🇺🇸 Estados Unidos</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === PASO 1: Pago === */}
            {step === 1 && (
              <div style={{ animation: 'slideUp .25s ease' }}>
                <div style={{ background: 'var(--dark-2)', borderRadius: '14px', border: '1px solid var(--dark-4)', padding: '24px', marginBottom: '20px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '6px', fontSize: '1.3rem' }}>Métodos de pago</h3>
                  <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '20px' }}>
                    Estos son los métodos disponibles. Elegirás el tuyo en la siguiente pantalla.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    {PAYMENT_METHODS.map(m => {
                      const Icon = m.icon;
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px', borderRadius: '10px',
                          border: '1px solid var(--dark-4)',
                          background: 'rgba(201,169,110,.04)',
                        }}>
                          <Icon size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</p>
                            <p style={{ fontSize: '.7rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aviso: todos los métodos redirigen a Wompi */}
                <div style={{ padding: '14px 16px', background: 'rgba(124,158,135,.10)', border: '1px solid rgba(124,158,135,.3)', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Shield size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--white)', marginBottom: '3px' }}>Pago procesado por Wompi</p>
                    <p style={{ fontSize: '.78rem', color: 'var(--gray-light)' }}>Serás redirigido a la pasarela segura de Wompi (Bancolombia) para elegir tu método y completar el pago. La transacción se confirma al instante.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'rgba(124,158,135,.08)', border: '1px solid rgba(124,158,135,.25)', borderRadius: '10px' }}>
                  <Lock size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '.8rem', color: 'var(--gray-light)', margin: 0 }}>
                    Tus datos están protegidos con cifrado SSL de 256 bits. Procesamos pagos a través de pasarelas certificadas PCI-DSS. Nunca almacenamos información sensible.
                  </p>
                </div>
              </div>
            )}

            {/* CTA buttons - en desktop */}
            <div className="checkout-cta-desktop" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)} className="btn btn-dark">Atrás</button>}
              <button type="submit" id={`checkout-step-${step}`} className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 18, height: 18, border: '2px solid rgba(31,26,18,.2)', borderTopColor: '#1F1A12', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                    Procesando...
                  </span>
                ) : step < steps.length - 1 ? (
                  <>Continuar al Pago →</>
                ) : (
                  <><Lock size={16} /> Ir a pagar — {formatCOP(grand)}</>
                )}
              </button>
            </div>
          </form>

          {/* === SIDEBAR ORDER SUMMARY === */}
          <aside style={{ position: 'relative' }}>
            <div className="checkout-sidebar" style={{
              background: 'var(--dark-2)', borderRadius: '16px',
              border: '1px solid rgba(201,169,110,.25)',
              padding: '24px', position: 'sticky', top: '90px',
              boxShadow: 'var(--shadow-md)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '4px', fontSize: '1.2rem' }}>Resumen del Pedido</h4>
              <p style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '18px' }}>{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>

              {/* FREE SHIPPING PROGRESS */}
              {remainingForFreeShipping > 0 ? (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(201,169,110,.08)', borderRadius: '10px', border: '1px solid rgba(201,169,110,.25)' }}>
                  <p style={{ fontSize: '.78rem', color: 'var(--white)', marginBottom: '8px' }}>
                    🚚 Te faltan <strong style={{ color: 'var(--gold)' }}>{formatCOP(remainingForFreeShipping)}</strong> para envío GRATIS
                  </p>
                  <div style={{ height: '6px', background: 'var(--dark-4)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (subtotalAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--gold-dark), var(--gold))',
                      transition: 'width .5s ease',
                    }} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(124,158,135,.10)', borderRadius: '10px', border: '1px solid rgba(124,158,135,.30)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                  <p style={{ fontSize: '.82rem', color: 'var(--white)', fontWeight: 600 }}>¡Felicidades! Envío GRATIS desbloqueado</p>
                </div>
              )}

              {/* ITEMS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                {items.map(item => (
                  <div key={item.key} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={item.images?.[0] || `/img/${item.slug}.webp`} alt={item.name}
                        onError={e => { if (!e.currentTarget.src.endsWith('placeholder-perfume.webp')) e.currentTarget.src = '/img/placeholder-perfume.webp'; }}
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '8px', background: 'var(--dark-3)' }} />
                      <span style={{
                        position: 'absolute', top: -6, right: -6,
                        minWidth: 20, height: 20, padding: '0 5px',
                        background: 'var(--gold)', color: '#1F1A12', borderRadius: '99px',
                        fontSize: '.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{item.quantity}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontSize: '.72rem', color: 'var(--gray)' }}>{item.selectedSize}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '.88rem' }}>{formatCOP(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* COUPON */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input" placeholder="Cupón de descuento" value={coupon}
                    onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponError(''); }}
                    style={{ fontSize: '.85rem', padding: '10px 12px' }} disabled={couponApplied} />
                  <button type="button" onClick={handleCoupon} className="btn btn-dark btn-sm" style={{ flexShrink: 0 }} disabled={couponApplied || !coupon.trim()}>
                    {couponApplied ? '✓' : 'Aplicar'}
                  </button>
                </div>
                {couponError && <p style={{ fontSize: '.75rem', color: 'var(--error)', marginTop: '6px' }}>{couponError}</p>}
                {couponApplied && <p style={{ fontSize: '.75rem', color: 'var(--success)', marginTop: '6px' }}>✓ Código aplicado: −15% en tu pedido</p>}
                {!couponApplied && <p style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '4px' }}>Prueba <strong style={{ color: 'var(--gold)' }}>BLISS15</strong> para 15% OFF</p>}
              </div>

              {/* TOTALS */}
              <div style={{ borderTop: '1px solid var(--dark-4)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)', fontSize: '.88rem' }}>Subtotal</span>
                  <span style={{ color: 'var(--white)' }}>{formatCOP(total)}</span>
                </div>
                {couponApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--success)', fontSize: '.88rem' }}>Descuento BLISS15</span>
                    <span style={{ color: 'var(--success)' }}>−{formatCOP(discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray)', fontSize: '.88rem' }}>Envío</span>
                  <span style={{ color: shipping === 0 ? 'var(--success)' : 'var(--white)', fontWeight: shipping === 0 ? 700 : 400 }}>
                    {shipping === 0 ? 'GRATIS' : formatCOP(shipping)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--dark-4)', paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '1.05rem' }}>Total</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1.4rem', fontFamily: 'var(--font-serif)' }}>{formatCOP(grand)}</span>
                </div>
              </div>

              {/* TRUST BADGES */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--dark-4)' }}>
                {[
                  { Icon: Truck,    title: 'Envío gratis', desc: 'a toda Colombia' },
                  { Icon: RotateCcw, title: 'Garantía 30 días', desc: 'Devolución sin preguntas' },
                  { Icon: Shield,   title: 'Pago Seguro', desc: 'SSL 256-bit · PCI-DSS' },
                  { Icon: Award,    title: '100% Original', desc: 'Auténtico o te devolvemos el dinero' },
                ].map(b => (
                  <div key={b.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <b.Icon size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--white)' }}>{b.title}</p>
                      <p style={{ fontSize: '.7rem', color: 'var(--gray)' }}>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* SOCIAL PROOF: rating */}
              <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(201,169,110,.05)', borderRadius: '10px', border: '1px solid rgba(201,169,110,.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={13} fill="var(--gold)" stroke="var(--gold)" />)}
                  <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--white)', marginLeft: '4px' }}>4.9/5</span>
                </div>
                <p style={{ fontSize: '.72rem', color: 'var(--gray-light)' }}>Basado en <strong style={{ color: 'var(--white)' }}>3,400+</strong> clientes satisfechos</p>
              </div>
            </div>

            {/* WhatsApp helper */}
            <a href={`https://wa.me/${PHONE_WHATSAPP}?text=${encodeURIComponent('Hola! Necesito ayuda con mi compra')}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center',
                marginTop: '12px', padding: '12px', borderRadius: '10px',
                background: 'rgba(37,211,102,.10)', border: '1px solid rgba(37,211,102,.30)',
                color: '#25D366', fontSize: '.85rem', fontWeight: 600, transition: 'all .2s',
              }}>
              <MessageCircle size={16} /> ¿Necesitas ayuda? Escríbenos
            </a>
          </aside>
        </div>
      </div>

      {/* RECENT PURCHASE NOTIFICATION */}
      {lastPurchase && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(31,26,18,.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(201,169,110,.30)',
          borderRadius: '99px', padding: '10px 18px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 30px rgba(31,26,18,.30)',
          animation: 'slideUp .3s ease',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 1.5s ease infinite' }} />
          <p style={{ fontSize: '.82rem', color: '#FAF6EE' }}>
            <strong>{lastPurchase}</strong> acaba de comprar
          </p>
        </div>
      )}

      {/* MOBILE STICKY CTA */}
      <div className="checkout-cta-mobile" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(201,169,110,.25)',
        padding: '12px 16px', display: 'none',
        boxShadow: '0 -4px 20px rgba(31,26,18,.10)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--gray)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold-dark)', fontWeight: 700 }}>{formatCOP(grand)}</span>
        </div>
        <button type="button" onClick={handleNext} className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? 'Procesando...' : step < steps.length - 1 ? 'Continuar al Pago' : paymentMethod === 'whatsapp' ? 'Continuar por WhatsApp' : `Pagar ${formatCOP(grand)}`}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { opacity: .5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-sidebar { position: static !important; }
          .checkout-cta-desktop { display: none !important; }
          .checkout-cta-mobile { display: block !important; }
          main { padding-bottom: 110px !important; }
        }
      `}</style>
    </main>
    </PageTransition>
  );
}
