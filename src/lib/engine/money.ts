// Deterministic centavos arithmetic — ported verbatim in behaviour from the
// original lib/quote-engine.js. PHP is the authoritative base currency.
const finite = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const toCentavos = (v: unknown) => Math.round((finite(v) + Number.EPSILON) * 100);
export const fromCentavos = (v: unknown) => Math.round(finite(v)) / 100;

export type LineInput = {
  description?: string;
  product_family?: string | null;
  system?: string | null;
  glass?: string | null;
  frame?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  quantity?: number | string;
  unit?: string;
  unit_price_centavos?: number | string;
  pricing_status?: string;
};

export type ChargeInput = {
  discount_centavos?: number | string;
  crating_centavos?: number | string;
  shipping_centavos?: number | string;
  trucking_centavos?: number | string;
  delivery_centavos?: number | string;
  installation_centavos?: number | string;
  tax_rate_basis_points?: number | null;
  tax_treatment?: string | null;
};

/**
 * The single deterministic money calculation used by quotes, POs and invoices.
 * All arithmetic is integer centavos. The agent never performs this maths.
 */
export function calculateTotals(lines: LineInput[], charges: ChargeInput) {
  const normalized = lines.map((l, i) => {
    const qty = finite(l.quantity);
    const unitPriceCentavos = Math.round(finite(l.unit_price_centavos));
    const amountCentavos = Math.round(qty * unitPriceCentavos);
    return { ...l, line_no: i + 1, quantity: qty, unit_price_centavos: unitPriceCentavos, amount_centavos: amountCentavos };
  });

  const subtotalCentavos = normalized.reduce((s, l) => s + l.amount_centavos, 0);
  const discountCentavos = Math.round(finite(charges.discount_centavos));
  const logisticsCentavos =
    Math.round(finite(charges.crating_centavos)) +
    Math.round(finite(charges.shipping_centavos)) +
    Math.round(finite(charges.trucking_centavos)) +
    Math.round(finite(charges.delivery_centavos));
  const installationCentavos = Math.round(finite(charges.installation_centavos));

  const preTaxCentavos = Math.max(
    0,
    subtotalCentavos - discountCentavos + logisticsCentavos + installationCentavos,
  );

  const bp = charges.tax_rate_basis_points;
  const taxCentavos = bp === null || bp === undefined ? 0 : Math.round((preTaxCentavos * Number(bp)) / 10000);
  const totalCentavos = preTaxCentavos + taxCentavos;

  return {
    lines: normalized,
    subtotalCentavos,
    discountCentavos,
    logisticsCentavos,
    installationCentavos,
    preTaxCentavos,
    taxCentavos,
    totalCentavos,
    currency: "PHP" as const,
    calculation: "deterministic-centavos" as const,
  };
}

/**
 * Readiness gate. A quote can only be approved by a human once every warning
 * is cleared. Historical prices are never auto-applied.
 */
export function quoteWarnings(
  header: { customer_name?: string; project_name?: string; location?: string | null; tax_treatment?: string | null; tax_rate_basis_points?: number | null },
  lines: LineInput[],
): string[] {
  const warnings: string[] = [];
  const text = (v: unknown) => String(v ?? "").trim();
  if (!text(header.customer_name)) warnings.push("Customer is required");
  if (!text(header.project_name)) warnings.push("Project is required");
  if (!lines.length) warnings.push("At least one line item is required");
  lines.forEach((l, i) => {
    if (!text(l.description) && !text(l.product_family)) warnings.push(`Line ${i + 1}: product/description required`);
    if (finite(l.quantity) <= 0) warnings.push(`Line ${i + 1}: quantity must be greater than zero`);
    if (finite(l.unit_price_centavos) <= 0) warnings.push(`Line ${i + 1}: current unit price requires owner entry/approval`);
    if (l.pricing_status !== "CURRENT_APPROVED") warnings.push(`Line ${i + 1}: price requires human approval (not historical evidence)`);
  });
  if (!text(header.tax_treatment)) warnings.push("Tax/VAT treatment requires explicit review — never inferred");
  if (header.tax_rate_basis_points === null || header.tax_rate_basis_points === undefined)
    warnings.push("Tax rate requires explicit input, including zero when applicable");
  return warnings;
}

export const PRICING_RULE =
  "Historical prices are evidence only. Current quote prices must be explicitly entered and approved by the owner.";
