'use client';
import { useState } from 'react';

// Convierte "Tom Ford" → "tom-ford" para nombre de archivo
function brandSlug(brand) {
  return String(brand || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin acentos
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Muestra el "logo" de la marca: si existe un archivo SVG/PNG en
// /public/img/brands/{slug}.svg o .png lo usa; si no, renderiza el nombre
// con tipografía display elegante (estilo logo).
//
// Para agregar logos reales más adelante: colocar el archivo en
// public/img/brands/tom-ford.svg (o .png) y aparecerá automáticamente.
// Orden de intento por archivo: SVG primero (escalable), luego PNG / WebP
const EXT_FALLBACKS = ['svg', 'png', 'webp'];

export default function BrandLogo({ brand, size = 'md', variant = 'auto', className = '' }) {
  const [extIdx, setExtIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  if (!brand) return null;

  const slug = brandSlug(brand);
  const showImage = variant !== 'text' && !imgFailed;
  const imgSrc = `/img/brands/${slug}.${EXT_FALLBACKS[extIdx]}`;

  const handleError = () => {
    // Si SVG falla, probar PNG; si PNG falla, probar WebP; si todo falla, caer a texto.
    if (extIdx < EXT_FALLBACKS.length - 1) setExtIdx(extIdx + 1);
    else setImgFailed(true);
  };

  // Los archivos en /img/brands están normalizados a 360×120 (ratio 3:1)
  // por scripts/normalize-brand-logos.mjs. Manteniendo el mismo ratio aquí,
  // todos los logos ocupan exactamente el mismo bounding box visual.
  const sizes = {
    sm: { fontSize: '.85rem', width: 96,  height: 32 },
    md: { fontSize: '1.1rem', width: 144, height: 48 },
    lg: { fontSize: '1.5rem', width: 210, height: 70 },
  };
  const s = sizes[size] || sizes.md;

  const imgStyle = {
    width: s.width,
    height: s.height,
    objectFit: 'contain',
    objectPosition: 'left center',
    maxWidth: '100%',
  };

  if (showImage && variant === 'image') {
    return (
      <img
        src={imgSrc}
        alt={brand}
        className={`brand-logo brand-logo-img ${className}`}
        style={imgStyle}
        onError={handleError}
      />
    );
  }

  // variant 'auto' (default): intenta imagen, si falla cae a texto
  // variant 'text': solo texto
  return (
    <>
      {showImage && (
        <img
          src={imgSrc}
          alt={brand}
          className={`brand-logo brand-logo-img ${className}`}
          style={{ ...imgStyle, display: imgFailed ? 'none' : 'block' }}
          onError={handleError}
        />
      )}
      {(variant === 'text' || imgFailed) && (
        <span className={`brand-logo brand-logo-text ${className}`} style={{ fontSize: s.fontSize, lineHeight: 1 }}>
          {brand}
        </span>
      )}
      <style>{`
        .brand-logo-text {
          font-family: var(--font-serif);
          font-weight: 400;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: inherit;
          display: inline-block;
          font-feature-settings: "smcp", "c2sc";
        }
      `}</style>
    </>
  );
}

export { brandSlug };
