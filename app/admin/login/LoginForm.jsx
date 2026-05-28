'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ next = '/admin' }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Contraseña incorrecta');
        setLoading(false);
        return;
      }
      // Forzamos un refresh para que el middleware vea la nueva cookie.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError('Error de red. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">SB</span>
          <h1 className="login-brand-name">ScentualBliss</h1>
          <p className="login-brand-sub">Panel administrativo</p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <label className="login-label" htmlFor="admin-pass">
            Contraseña
          </label>
          <input
            id="admin-pass"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="login-input"
            placeholder="••••••••••••"
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading || !password} className="login-button">
            {loading ? 'Verificando…' : 'Entrar'}
          </button>

          <p className="login-hint">
            Acceso restringido al equipo de ScentualBliss.
          </p>
        </form>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 2rem 1.5rem;
          background:
            radial-gradient(1200px 600px at 20% 10%, rgba(192, 154, 90, 0.18), transparent 60%),
            radial-gradient(900px 500px at 80% 90%, rgba(120, 80, 50, 0.2), transparent 55%),
            linear-gradient(180deg, #1c1611 0%, #0e0a07 100%);
          color: #f3ead7;
          font-family: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(28, 22, 17, 0.7);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(192, 154, 90, 0.22);
          border-radius: 18px;
          padding: 2.5rem 2rem 2rem;
          box-shadow:
            0 30px 60px -20px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(192, 154, 90, 0.05) inset;
        }
        .login-brand {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-brand-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: 0.04em;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px -10px rgba(192, 154, 90, 0.6);
        }
        .login-brand-name {
          font-size: 1.4rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          margin: 0;
          color: #f3ead7;
        }
        .login-brand-sub {
          margin: 0.25rem 0 0;
          font-size: 0.8rem;
          color: rgba(243, 234, 215, 0.55);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .login-label {
          font-size: 0.75rem;
          color: rgba(243, 234, 215, 0.7);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }
        .login-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: rgba(14, 10, 7, 0.6);
          border: 1px solid rgba(192, 154, 90, 0.22);
          border-radius: 10px;
          color: #f3ead7;
          font-size: 1rem;
          letter-spacing: 0.05em;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input::placeholder {
          color: rgba(243, 234, 215, 0.25);
          letter-spacing: 0.2em;
        }
        .login-input:focus {
          outline: none;
          border-color: rgba(192, 154, 90, 0.6);
          box-shadow: 0 0 0 3px rgba(192, 154, 90, 0.12);
        }
        .login-input:disabled {
          opacity: 0.5;
        }
        .login-error {
          margin: 0.25rem 0 0;
          padding: 0.6rem 0.85rem;
          background: rgba(180, 60, 50, 0.15);
          border: 1px solid rgba(180, 60, 50, 0.4);
          border-radius: 8px;
          font-size: 0.85rem;
          color: #f5c2bc;
        }
        .login-button {
          margin-top: 0.5rem;
          padding: 0.9rem 1rem;
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px -12px rgba(192, 154, 90, 0.7);
        }
        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .login-hint {
          margin: 1rem 0 0;
          text-align: center;
          font-size: 0.75rem;
          color: rgba(243, 234, 215, 0.4);
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
