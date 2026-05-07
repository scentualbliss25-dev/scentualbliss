'use client';
import { useState, useEffect } from 'react';

function getTimeLeft(endDate) {
  const diff = new Date(endDate) - Date.now();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / 3600000) % 24,
    minutes: Math.floor(diff / 60000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

export default function CountdownTimer({ endDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    setTimeLeft(getTimeLeft(endDate));
    const t = setInterval(() => setTimeLeft(getTimeLeft(endDate)), 1000);
    return () => clearInterval(t);
  }, [endDate]);

  if (!timeLeft) return null;

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {[
        { label: 'Hrs', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Seg', value: timeLeft.seconds },
      ].map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--dark-3)', border: '1px solid rgba(201,169,110,.3)',
            borderRadius: '8px', padding: '10px 14px', minWidth: '60px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--gold)', lineHeight: 1, fontWeight: 600 }}>
              {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '.65rem', color: 'var(--gray)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
          </div>
          {i < 2 && <span style={{ color: 'var(--gold)', fontSize: '1.4rem', fontWeight: 700, marginTop: '-8px' }}>:</span>}
        </div>
      ))}
    </div>
  );
}
