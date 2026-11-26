export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}
