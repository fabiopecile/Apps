export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded bg-surface-muted" />
        <div className="h-9 w-32 rounded-lg bg-surface-muted" />
      </div>
      <div className="card h-16 w-full" />
      <div className="card h-64 w-full" />
      <div className="card h-40 w-full" />
    </div>
  );
}
