import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePublicUrl } from "./site-url.ts";

test("localhost rejected", () => assert.equal(resolvePublicUrl("http://localhost:3000").ok, false));
test("LAN address rejected", () => assert.equal(resolvePublicUrl("https://192.168.1.10").ok, false));
test("127.0.0.1 rejected", () => assert.equal(resolvePublicUrl("https://127.0.0.1:3000").ok, false));
test("plain http rejected", () => assert.equal(resolvePublicUrl("http://shop.example.com").ok, false));
test("missing / invalid rejected", () => { assert.equal(resolvePublicUrl(undefined).ok, false); assert.equal(resolvePublicUrl("not a url").ok, false); });
test("https domain accepted, path and slash dropped", () => assert.equal(resolvePublicUrl("https://shop.example.com/").url, "https://shop.example.com"));
test("vercel domain accepted but flagged", () => {
  const r = resolvePublicUrl("https://my-store.vercel.app");
  assert.equal(r.ok, true);
  assert.equal(r.isVercelDomain, true);
});
