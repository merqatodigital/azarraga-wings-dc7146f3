import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQuoteCommercialTotal,
  copyQuoteLinesToPurchaseOrder,
  normalizePurchaseOrderNumber,
  purchaseOrderComparison,
  purchaseOrderLineSubtotal,
} from "../src/lib/purchase-order.ts";

test("normalizes and validates PO numbers", () => {
  assert.equal(normalizePurchaseOrderNumber("  PO   123  "), "PO 123");
  assert.throws(() => normalizePurchaseOrderNumber("   "), /required/);
});

test("copies quote scope, dimensions and deterministic pricing", () => {
  const lines = copyQuoteLinesToPurchaseOrder("po-1", [
    {
      line_no: 4,
      description: "SD12 900 Series sliding door",
      quantity: 2,
      unit: "set",
      unit_price_centavos: 125_050,
      amount_centavos: 1,
      product_family: "Door",
      system: "900 Series",
      glass: "10mm clear tempered",
      frame: "Powder-coated black",
      width_mm: 1800,
      height_mm: 2100,
    },
  ]);

  assert.deepEqual(lines[0], {
    purchase_order_id: "po-1",
    line_no: 4,
    description: "SD12 900 Series sliding door",
    raw_description: "SD12 900 Series sliding door",
    quantity: 2,
    unit: "set",
    unit_price_centavos: 125_050,
    amount_centavos: 250_100,
    product_family: "Door",
    system: "900 Series",
    glass_type: "10mm clear tempered",
    frame_color: "Powder-coated black",
    width_mm: 1800,
    height_mm: 2100,
    raw_dimensions: "1800 × 2100 mm",
    confidence: 1,
    human_review_required: false,
  });
  assert.equal(purchaseOrderLineSubtotal(lines), 250_100);
});

test("rejects invalid PO line commercial values", () => {
  assert.throws(
    () =>
      copyQuoteLinesToPurchaseOrder("po-1", [
        { description: "Door", quantity: 0, unit_price_centavos: 10_000 },
      ]),
    /quantity greater than zero/,
  );
  assert.throws(
    () =>
      copyQuoteLinesToPurchaseOrder("po-1", [
        { description: "", quantity: 1, unit_price_centavos: 10_000 },
      ]),
    /missing its description/,
  );
});

test("records deterministic quote-to-PO comparison", () => {
  const total = calculateQuoteCommercialTotal({
    subtotal_centavos: 250_100,
    tax_centavos: 30_012,
    shipping_centavos: 5_000,
    discount_centavos: 5_000,
  });
  assert.equal(total, 280_112);
  assert.deepEqual(purchaseOrderComparison(250_100, 280_112, 250_100, total), {
    source: "APPROVED_QUOTE",
    quoteSubtotalCentavos: 250_100,
    quoteTotalCentavos: 280_112,
    copiedLineSubtotalCentavos: 250_100,
    calculatedQuoteTotalCentavos: 280_112,
    lineSubtotalMatched: true,
    totalMatched: true,
  });
});
