import QRCode from "qrcode";
import { requireAdmin } from "@/lib/supabase/server";
import { resolvePublicUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const info = resolvePublicUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!info.ok || !info.url) return new Response(info.reason ?? "Invalid site URL", { status: 400 });

  const params = new URL(req.url).searchParams;
  const base = { errorCorrectionLevel: "H" as const, margin: 2 };
  const headers = { "Cache-Control": "no-store" };

  if (params.get("format") === "svg") {
    const svg = await QRCode.toString(info.url, { ...base, type: "svg" });
    return new Response(svg, {
      headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": 'attachment; filename="store-qr.svg"' },
    });
  }

  const size = Math.min(4096, Math.max(512, Number(params.get("size")) || 2048));
  const png = await QRCode.toBuffer(info.url, { ...base, type: "png", width: size });
  return new Response(new Uint8Array(png), {
    headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="store-qr-${size}.png"` },
  });
}
