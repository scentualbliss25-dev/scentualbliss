'use client';

export default function DownloadButton({ count = 0 }) {
  function onDownload() {
    const prev = document.title;
    document.title = `Catalogo-ScentualBliss-${new Date().toISOString().slice(0, 10)}`;
    window.print();
    document.title = prev;
  }

  return (
    <>
      <button type="button" className="pubcat-download" onClick={onDownload} disabled={count === 0}>
        ⬇ Descargar / Imprimir PDF
      </button>
      <style jsx>{`
        .pubcat-download {
          padding: 0.7rem 1.2rem;
          background: linear-gradient(135deg, #c09a5a, #8a6936);
          color: #1c1611;
          border: none;
          border-radius: 9px;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          font-family: inherit;
          cursor: pointer;
          transition: box-shadow 0.18s, transform 0.15s;
          white-space: nowrap;
        }
        .pubcat-download:hover:not(:disabled) {
          box-shadow: 0 10px 22px -12px rgba(192, 154, 90, 0.6);
          transform: translateY(-1px);
        }
        .pubcat-download:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </>
  );
}
