'use client';

// Error boundary global del App Router.
// IMPORTANTE: este archivo está MINIMAL a propósito. En el pasado tuvimos
// un error.jsx más elaborado que enmascaraba bugs reales y rompía la
// navegación SPA. Aquí solo reportamos el error a Sentry y mostramos un
// mensaje básico. Next.js maneja por sí solo los errores transitorios.

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          background: '#FDFBF7',
          color: '#1F1A14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            textAlign: 'center',
            padding: '40px 28px',
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E5DCC7',
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: '#B8905C',
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            ScentualBliss
          </div>
          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '1.6rem',
              fontWeight: 400,
              marginBottom: 14,
              color: '#1F1A14',
            }}
          >
            Algo salió mal
          </h1>
          <p
            style={{
              color: '#4A3F33',
              fontSize: '.95rem',
              lineHeight: 1.65,
              marginBottom: 26,
            }}
          >
            Tuvimos un problema técnico. Ya quedó reportado a nuestro
            equipo. Intenta recargar la página.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#1F1A14',
              color: '#FAF6EE',
              padding: '12px 26px',
              borderRadius: 6,
              fontSize: '.85rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            Volver al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
