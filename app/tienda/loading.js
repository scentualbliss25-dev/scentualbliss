export default function Loading() {
  return (
    <main style={{ minHeight: '80vh' }} aria-busy="true">
      <div className="shop-header">
        <div className="container">
          <div className="skeleton skeleton-eyebrow" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" style={{ width: 120, marginTop: 12 }} />
        </div>
      </div>
      <div className="container shop-body">
        <div className="skeleton skeleton-filter-row" style={{ marginBottom: 16 }} />
        <div className="skeleton skeleton-filter-row" style={{ marginBottom: 16 }} />
        <div className="skeleton skeleton-line" style={{ width: 240, height: 44, marginBottom: 28 }} />
        <div className="grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-card-img" />
              <div className="skeleton skeleton-line" style={{ width: '40%', marginTop: 14 }} />
              <div className="skeleton skeleton-line" style={{ width: '80%', marginTop: 8, height: 18 }} />
              <div className="skeleton skeleton-line" style={{ width: '30%', marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
