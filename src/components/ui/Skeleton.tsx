export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-row ${className}`} />;
}

export function FileListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}
