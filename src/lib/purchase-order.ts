export type PurchaseOrderLineSource = {
  line_no?: number | null;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price_centavos?: number | null;
  amount_centavos?: number | null;
  product_family?: string | null;
  system?: string | null;
  glass?: string | null;
  frame?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
};

export function normalizePurchaseOrderNumber(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Client PO number is required");
  if (normalized.length > 120) throw new Error("Client PO number must be 120 characters or fewer");
  return normalized;
}

export function calculateLineAmount(quantity: number, unitPriceCentavos: number) {
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("Every PO line requires a quantity greater than zero");
  if (!Number.isInteger(unitPriceCentavos) || unitPriceCentavos < 0)
    throw new Error("Every PO line requires a valid integer-centavo unit price");
  return Math.round(quantity * unitPriceCentavos);
}

export function copyQuoteLinesToPurchaseOrder(
  purchaseOrderId: string,
  lines: PurchaseOrderLineSource[],
) {
  if (!lines.length) throw new Error("Cannot receive a PO for a quotation with no line items");

  return lines.map((line, index) => {
    const description = String(line.description || "").trim();
    if (!description) throw new Error(`PO line ${index + 1} is missing its description`);
    const quantity = Number(line.quantity);
    const unitPriceCentavos = Number(line.unit_price_centavos);
    const amountCentavos = calculateLineAmount(quantity, unitPriceCentavos);
    const widthMm = line.width_mm == null ? null : Number(line.width_mm);
    const heightMm = line.height_mm == null ? null : Number(line.height_mm);

    return {
      purchase_order_id: purchaseOrderId,
      line_no: Number(line.line_no) || index + 1,
      description,
      raw_description: description,
      quantity,
      unit: String(line.unit || "set").trim() || "set",
      unit_price_centavos: unitPriceCentavos,
      amount_centavos: amountCentavos,
      product_family: line.product_family || null,
      system: line.system || null,
      glass_type: line.glass || null,
      frame_color: line.frame || null,
      width_mm: Number.isFinite(widthMm) ? widthMm : null,
      height_mm: Number.isFinite(heightMm) ? heightMm : null,
      raw_dimensions:
        Number.isFinite(widthMm) && Number.isFinite(heightMm)
          ? `${widthMm} × ${heightMm} mm`
          : null,
      confidence: 1,
      human_review_required: false,
    };
  });
}

export function purchaseOrderLineSubtotal(lines: Array<{ amount_centavos: number }>) {
  return lines.reduce((sum, line) => sum + Number(line.amount_centavos || 0), 0);
}

export function calculateQuoteCommercialTotal(input: {
  subtotal_centavos?: number | null;
  tax_centavos?: number | null;
  crating_centavos?: number | null;
  shipping_centavos?: number | null;
  trucking_centavos?: number | null;
  delivery_centavos?: number | null;
  installation_centavos?: number | null;
  discount_centavos?: number | null;
}) {
  return Math.max(
    0,
    Number(input.subtotal_centavos || 0) +
      Number(input.tax_centavos || 0) +
      Number(input.crating_centavos || 0) +
      Number(input.shipping_centavos || 0) +
      Number(input.trucking_centavos || 0) +
      Number(input.delivery_centavos || 0) +
      Number(input.installation_centavos || 0) -
      Number(input.discount_centavos || 0),
  );
}

export function purchaseOrderComparison(
  quoteSubtotalCentavos: number,
  quoteTotalCentavos: number,
  copiedLineSubtotalCentavos: number,
  calculatedQuoteTotalCentavos = quoteTotalCentavos,
) {
  return {
    source: "APPROVED_QUOTE",
    quoteSubtotalCentavos,
    quoteTotalCentavos,
    copiedLineSubtotalCentavos,
    calculatedQuoteTotalCentavos,
    lineSubtotalMatched: quoteSubtotalCentavos === copiedLineSubtotalCentavos,
    totalMatched: quoteTotalCentavos === calculatedQuoteTotalCentavos,
  };
}
