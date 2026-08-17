export const UNCLASSIFIED_PRODUCT_FAMILY = "UNCLASSIFIED";

export function learnedProductFamily(line: { productFamily?: string | null }) {
  return line.productFamily?.trim() || UNCLASSIFIED_PRODUCT_FAMILY;
}

export function statedDocumentTotalCentavos(document: {
  financialSummary?: { totalCentavos?: number | null } | null;
  totalCentavos?: number | null;
}) {
  const total = document.financialSummary?.totalCentavos ?? document.totalCentavos;
  return total == null ? null : Number(total);
}
