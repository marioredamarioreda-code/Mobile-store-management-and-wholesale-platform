import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsApp } from "./phone.ts";

test("local Egyptian mobile", () => assert.equal(normalizeWhatsApp("0100 123 4567"), "201001234567"));
test("already international", () => assert.equal(normalizeWhatsApp("+20 100 123 4567"), "201001234567"));
test("00 prefix", () => assert.equal(normalizeWhatsApp("0020100 1234567"), "201001234567"));
test("empty", () => assert.equal(normalizeWhatsApp(""), ""));
