export default function Loading() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />)}
    </div>
  );
}
