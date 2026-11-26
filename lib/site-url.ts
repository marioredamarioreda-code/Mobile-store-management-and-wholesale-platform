export interface PublicUrlInfo {
  url: string | null;      // origin only, e.g. https://shop.example.com
  ok: boolean;
  reason?: string;         // Arabic explanation when not ok
  isVercelDomain: boolean; // true for *.vercel.app (fine, but a custom domain is better for a printed QR)
}

/** Validates the permanent public store URL. A QR code must never point to a local or non-HTTPS address. */
export function resolvePublicUrl(raw: string | undefined): PublicUrlInfo {
  const v = (raw ?? "").trim();
  if (!v) return { url: null, ok: false, reason: "لم يتم ضبط المتغير NEXT_PUBLIC_SITE_URL", isVercelDomain: false };

  let u: URL;
  try { u = new URL(v); } catch { return { url: null, ok: false, reason: "الرابط المضبوط غير صالح", isVercelDomain: false }; }

  const host = u.hostname.toLowerCase();
  const isLocal =
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "[::1]" ||
    /^(127\.|10\.|192\.168\.|0\.0\.0\.0$|169\.254\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  const isVercelDomain = host.endsWith(".vercel.app");

  if (isLocal) return { url: null, ok: false, reason: "الرابط محلي (localhost) ولا يعمل لدى العملاء", isVercelDomain };
  if (u.protocol !== "https:") return { url: null, ok: false, reason: "الرابط يجب أن يبدأ بـ https://", isVercelDomain };
  return { url: u.origin, ok: true, isVercelDomain };
}
