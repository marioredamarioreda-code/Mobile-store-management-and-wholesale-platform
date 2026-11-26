/** Normalizes an Egyptian/international number to digits with country code, as wa.me expects. */
export function normalizeWhatsApp(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = "20" + d.slice(1); // 01001234567 -> 201001234567
  return d;
}
