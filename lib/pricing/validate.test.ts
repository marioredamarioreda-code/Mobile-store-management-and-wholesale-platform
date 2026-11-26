import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRules, type RuleDraft } from "./validate.ts";

const r = (min: number, max: number | null, type: RuleDraft["customer_type"] = "wholesale", value = 5): RuleDraft =>
  ({ customer_type: type, min_qty: min, max_qty: max, discount_type: "percent", value });

test("valid tiers incl. open-ended", () => assert.equal(validateRules([r(2, 2), r(3, 4), r(5, 9), r(10, null)]), null));
test("overlap detected", () => assert.match(validateRules([r(2, 5), r(5, 9)])!, /متداخلة/));
test("open-ended overlaps anything after it", () => assert.match(validateRules([r(10, null), r(20, 30)])!, /متداخلة/));
test("same range allowed for different customer types", () => assert.equal(validateRules([r(2, 5), r(2, 5, "retail")]), null));
test("max < min rejected", () => assert.ok(validateRules([r(5, 3)])));
test("percent > 100 rejected", () => assert.ok(validateRules([r(1, 1, "retail", 120)])));
test("min < 1 rejected", () => assert.ok(validateRules([r(0, 3)])));
