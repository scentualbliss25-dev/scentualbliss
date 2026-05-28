'use client';
import { useState, useEffect } from 'react';
import { Star, CheckCircle } from 'lucide-react';

function StarRating({ value, onChange, size = 24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 2, lineHeight: 1 }}
        >
          <Star
            size={size}
            fill={(hover || value) >= s ? 'var(--gold)' : 'none'}
            stroke={(hover || value) >= s ? 'var(--gold)' : 'rgba(26,22,16,.2)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(26,22,16,.07)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--white)' }}>{review.author_name}</p>
            {review.verified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.65rem', color: 'var(--success)', letterSpacing: '.08em' }}>
                <CheckCircle size={11} /> Compra verificada
              </span>
            )}
          </div>
          <StarRating value={review.rating} size={13} />
        </div>
        <p style={{ fontSize: '.72rem', color: 'var(--gray)', flexShrink: 0 }}>
          {new Date(review.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      {review.title && (
        <p style={{ fontWeight: 600, color: 'var(--white)', fontSize: '.9rem', marginBottom: 6 }}>{review.title}</p>
      )}
      <p style={{ color: 'var(--gray)', fontSize: '.9rem', lineHeight: 1.75 }}>{review.text}</p>
    </div>
  );
}

function ReviewForm({ productSlug, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState({ author_name: '', title: '', text: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Por favor selecciona una calificación'); return; }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: productSlug, rating, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error enviando reseña');
      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ padding: '32px', background: 'rgba(107,142,122,.08)', borderLeft: '3px solid var(--success)', marginTop: 32 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--white)', marginBottom: 8 }}>¡Gracias por tu reseña!</p>
        <p style={{ color: 'var(--gray)', fontSize: '.88rem' }}>Será publicada una vez revisada por nuestro equipo.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 32, padding: '28px', background: '#FFFFFF', border: '1px solid rgba(26,22,16,.08)' }}>
      <p style={{ fontSize: '.62rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500, marginBottom: 20 }}>Escribir una reseña</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 10 }}>Tu calificación *</label>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 8 }}>Nombre *</label>
          <input
            required
            value={form.author_name}
            onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
            placeholder="Tu nombre"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(26,22,16,.15)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '.88rem', color: 'var(--white)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 8 }}>Título</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Resumen de tu experiencia"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(26,22,16,.15)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '.88rem', color: 'var(--white)', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 8 }}>Tu reseña *</label>
        <textarea
          required
          rows={4}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Comparte tu experiencia con esta fragancia..."
          style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(26,22,16,.15)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '.88rem', color: 'var(--white)', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {error && <p style={{ color: 'var(--error)', fontSize: '.82rem', marginBottom: 16 }}>{error}</p>}

      <button type="submit" disabled={status === 'loading'} className="btn btn-primary" style={{ opacity: status === 'loading' ? 0.6 : 1 }}>
        {status === 'loading' ? 'Enviando...' : 'Publicar Reseña'}
      </button>
      <p style={{ fontSize: '.72rem', color: 'var(--gray)', marginTop: 12 }}>Las reseñas son revisadas antes de publicarse.</p>
    </form>
  );
}

export default function ProductReviews({ productSlug, initialRating, initialCount }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?slug=${productSlug}`, { cache: 'no-store' });
      if (res.ok) setReviews(await res.json());
    } catch { /* silently fail */ }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [productSlug]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : initialRating;

  const ratingCount = reviews.length || initialCount;

  const dist = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === s).length / reviews.length * 100) : 0,
  }));

  return (
    <section style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(26,22,16,.07)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
        <div>
          <p style={{ fontSize: '.62rem', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500, marginBottom: 12 }}>Reseñas</p>
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', fontWeight: 300, color: 'var(--white)', lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
              <div>
                <StarRating value={Math.round(avgRating)} size={16} />
                <p style={{ fontSize: '.78rem', color: 'var(--gray)', marginTop: 4 }}>{ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 300, color: 'var(--gray-light)', fontStyle: 'italic' }}>
              Sé el primero en compartir tu experiencia.
            </p>
          )}
        </div>

        {/* Distribution bars */}
        {reviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
            {dist.map(d => (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '.72rem', color: 'var(--gray)', width: 8 }}>{d.stars}</span>
                <Star size={10} fill="var(--gold)" stroke="var(--gold)" />
                <div style={{ flex: 1, height: 4, background: 'rgba(26,22,16,.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: 'var(--gold)', transition: 'width .5s' }} />
                </div>
                <span style={{ fontSize: '.72rem', color: 'var(--gray)', width: 24 }}>{d.count}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowForm(f => !f)}
          className="btn btn-outline btn-sm"
        >
          {showForm ? 'Cancelar' : 'Escribir reseña'}
        </button>
      </div>

      {showForm && (
        <ReviewForm productSlug={productSlug} onSuccess={() => { setShowForm(false); fetchReviews(); }} />
      )}

      {loading ? (
        <p style={{ color: 'var(--gray)', fontSize: '.88rem', padding: '20px 0' }}>Cargando reseñas...</p>
      ) : reviews.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gray)', fontStyle: 'italic', fontWeight: 300 }}>Aún no hay reseñas</p>
          <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginTop: 8 }}>Sé el primero en compartir tu experiencia</p>
        </div>
      ) : (
        <div>
          {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      <style>{`@media(max-width:600px){section > div:first-child{flex-direction:column;}}`}</style>
    </section>
  );
}
