'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/ui/ScrollAnimations';

const TOAST_STYLE = { style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(201,169,110,.3)' }, iconTheme: { primary: '#C9A96E', secondary: '#000' } };

const info = [
  { icon: Mail, label: 'Email', value: 'ventas@scentualbliss.com.co', href: 'mailto:ventas@scentualbliss.com.co' },
  { icon: Phone, label: 'Teléfono', value: '+1 (234) 567-890', href: 'tel:+1234567890' },
  { icon: MapPin, label: 'Ubicación', value: 'Ciudad de México, México', href: null },
  { icon: Clock, label: 'Horario', value: 'Lun–Vie 9:00–18:00', href: null },
];

export default function ContactPageClient() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success('¡Mensaje enviado! Te responderemos en menos de 24 horas.', { ...TOAST_STYLE, duration: 5000 });
    setForm({ name: '', email: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <PageTransition>
    <main style={{ minHeight: '80vh' }}>
      <div style={{ background: 'var(--dark-2)', borderBottom: '1px solid rgba(201,169,110,.1)', padding: '48px 0 32px' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--gold)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '8px' }}>ScentualBliss</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', marginBottom: '8px' }}>Contáctanos</h1>
          <p style={{ color: 'var(--gray)' }}>Estamos aquí para ayudarte. Escríbenos y te respondemos pronto.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '60px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '64px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--white)', fontSize: '1.8rem', marginBottom: '8px' }}>Hablemos</h2>
            <p style={{ color: 'var(--gray)', marginBottom: '40px', lineHeight: 1.7 }}>
              ¿Tienes dudas sobre una fragancia, tu pedido o quieres asesoría personalizada? Con gusto te ayudamos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {info.map(({ icon: Icon, label, value, href }) => (
                <div key={label} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '2px' }}>{label}</p>
                    {href
                      ? <a href={href} style={{ color: 'var(--white)', fontSize: '.95rem', transition: 'color .2s' }}>{value}</a>
                      : <p style={{ color: 'var(--white)', fontSize: '.95rem' }}>{value}</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ background: 'var(--dark-2)', border: '1px solid rgba(201,169,110,.15)', borderRadius: '16px', padding: '36px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--white)', marginBottom: '28px', fontWeight: 300, fontSize: '1.5rem' }}>Envíanos un mensaje</h3>
            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label>Nombre</label>
                <input required className="input" placeholder="Ana García" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input required type="email" className="input" placeholder="ana@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Asunto</label>
              <input required className="input" placeholder="¿En qué podemos ayudarte?" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mensaje</label>
              <textarea required className="input" rows={5} placeholder="Cuéntanos más..." value={form.message} onChange={e => set('message', e.target.value)}
                style={{ resize: 'vertical', minHeight: '120px', fontFamily: 'var(--font-sans)' }} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(31,26,18,.08)', borderTopColor: 'var(--black)', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                    Enviando...
                  </span>
                : <><Send size={16} /> Enviar Mensaje</>
              }
            </button>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width:768px) { main > .container > div { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
    </PageTransition>
  );
}
