import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, calculateProfit, type PricingRule } from "./engine.ts";

const rules: PricingRule[] = [
  { customerType: "wholesale", minQty: 1, maxQty: 1, discountType: "percent", value: 0 },
  { customerType: "wholesale", minQty: 2, maxQty: 2, discountType: "percent", value: 5 },
  { customerType: "wholesale", minQty: 3, maxQty: 4, discountType: "percent", value: 7 },
  { customerType: "wholesale", minQty: 5, maxQty: 9, discountType: "percent", value: 10 },
  { customerType: "wholesale", minQty: 10, maxQty: null, discountType: "fixed_price", value: 4500 },
];
const base = { retailPrice: 5200, wholesalePrice: 5050, rules };

test("wholesale 1 piece = 5050", () => {
  const r = calculatePrice({ ...base, customerType: "wholesale", quantity: 1 });
  assert.equal(r.unitPrice, 5050);
  assert.equal(r.total, 5050);
});
test("wholesale 2 pieces = 4797.50 (5%)", () => {
  const r = calculatePrice({ ...base, customerType: "wholesale", quantity: 2 });
  assert.equal(r.unitPrice, 4797.5);
  assert.equal(r.discountPercent, 5);
  assert.equal(r.total, 9595);
});
test("wholesale 3 pieces = 4696.50 (7%)", () => {
  const r = calculatePrice({ ...base, customerType: "wholesale", quantity: 3 });
  assert.equal(r.unitPrice, 4696.5);
  assert.equal(r.total, 14089.5);
});
test("tier boundaries 4, 5, 9", () => {
  assert.equal(calculatePrice({ ...base, customerType: "wholesale", quantity: 4 }).discountPercent, 7);
  assert.equal(calculatePrice({ ...base, customerType: "wholesale", quantity: 5 }).discountPercent, 10);
  assert.equal(calculatePrice({ ...base, customerType: "wholesale", quantity: 9 }).discountPercent, 10);
});
test("open-ended tier 10+ with fixed unit price", () => {
  const r = calculatePrice({ ...base, customerType: "wholesale", quantity: 25 });
  assert.equal(r.unitPrice, 4500);
  assert.equal(r.total, 112500);
});
test("retail ignores wholesale rules", () => {
  const r = calculatePrice({ ...base, customerType: "retail", quantity: 5 });
  assert.equal(r.unitPrice, 5200);
  assert.equal(r.ruleApplied, false);
});
test("amount_off rule and never below zero", () => {
  const r = calculatePrice({
    retailPrice: 100, wholesalePrice: 90, customerType: "retail", quantity: 2,
    rules: [{ customerType: "retail", minQty: 2, maxQty: null, discountType: "amount_off", value: 150 }],
  });
  assert.equal(r.unitPrice, 0);
});
test("invalid quantity throws", () => {
  assert.throws(() => calculatePrice({ ...base, customerType: "retail", quantity: 0 }), RangeError);
});
test("profit calculation", () => {
  const p = calculateProfit(5050, 5000, 3);
  assert.equal(p.profitPerUnit, 50);
  assert.equal(p.totalProfit, 150);
  assert.equal(p.marginPercent, 0.99);
});
