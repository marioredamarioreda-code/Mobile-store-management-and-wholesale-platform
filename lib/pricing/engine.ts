/**
 * Pricing engine: a pure function used by BOTH the browser (instant feedback)
 * and the server (authoritative price). It never sees purchase cost.
 */
export type CustomerType = "retail" | "wholesale";
export type DiscountType = "percent" | "amount_off" | "fixed_price";

export interface PricingRule {
  customerType: CustomerType;
  minQty: number;
  maxQty: number | null; // null = open ended (e.g. 10+)
  discountType: DiscountType;
  value: number;
}

export interface PriceInput {
  retailPrice: number;
  wholesalePrice: number;
  rules: PricingRule[];
  customerType: CustomerType;
  quantity: number;
}

export interface PriceResult {
  quantity: number;
  basePrice: number;        // price before quantity discount
  unitPrice: number;        // final price per piece
  discountType: DiscountType | null;
  discountValue: number;    // raw rule value (0 if none)
  discountPercent: number;  // effective % off base price, 2 decimals
  savingsPerUnit: number;
  total: number;
  ruleApplied: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function findRule(rules: PricingRule[], customerType: CustomerType, quantity: number) {
  return rules.find(
    (r) => r.customerType === customerType && quantity >= r.minQty && (r.maxQty === null || quantity <= r.maxQty)
  );
}

export function calculatePrice(input: PriceInput): PriceResult {
  const quantity = Math.floor(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) throw new RangeError("quantity must be an integer >= 1");

  const basePrice = input.customerType === "wholesale" ? input.wholesalePrice : input.retailPrice;
  const rule = findRule(input.rules, input.customerType, quantity);

  let unitPrice = basePrice;
  if (rule) {
    switch (rule.discountType) {
      case "percent":
        unitPrice = basePrice * (1 - rule.value / 100);
        break;
      case "amount_off":
        unitPrice = basePrice - rule.value;
        break;
      case "fixed_price":
        unitPrice = rule.value;
        break;
    }
  }
  unitPrice = round2(Math.max(0, unitPrice));

  const savingsPerUnit = round2(Math.max(0, basePrice - unitPrice));
  return {
    quantity,
    basePrice: round2(basePrice),
    unitPrice,
    discountType: rule?.discountType ?? null,
    discountValue: rule?.value ?? 0,
    discountPercent: basePrice > 0 ? round2((savingsPerUnit / basePrice) * 100) : 0,
    savingsPerUnit,
    total: round2(unitPrice * quantity),
    ruleApplied: Boolean(rule),
  };
}

/** ADMIN-ONLY: profit figures. Import only from server code that has verified admin. */
export function calculateProfit(unitPrice: number, purchaseCost: number, quantity: number) {
  const profitPerUnit = round2(unitPrice - purchaseCost);
  return {
    profitPerUnit,
    totalProfit: round2(profitPerUnit * quantity),
    marginPercent: unitPrice > 0 ? round2((profitPerUnit / unitPrice) * 100) : 0,
  };
}
