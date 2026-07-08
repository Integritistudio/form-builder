export function AppShell({ children, className = "" }) {
  const rootClass = className ? `app ${className}` : "app";
  return <div className={rootClass}>{children}</div>;
}

export function PageHero({ title, subtitle, meta }) {
  return (
    <div className="app-hero">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {meta && <div className="app-hero-meta">{meta}</div>}
    </div>
  );
}

export function AppPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="app-pagination">
      <button
        type="button"
        className="app-btn-outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="app-subdued">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="app-btn-outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
