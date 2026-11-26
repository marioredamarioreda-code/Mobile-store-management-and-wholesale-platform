/** Unicode-aware slug (keeps Arabic letters) + short random suffix to avoid collisions. */
export function makeSlug(text: string) {
  const base =
    text.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
