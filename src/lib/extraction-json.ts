function balancedJsonObjects(text: string) {
  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function normalizeExtraction(value: any) {
  if (!value || typeof value !== "object") throw new Error("missing extraction object");
  if (!Array.isArray(value.lines)) throw new Error("missing line-item array");
  value.lines = value.lines.map((line: any, index: number) => ({
    ...line,
    lineNo: Number(line.lineNo) || index + 1,
    quantity: Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0,
    unit: String(line.unit || ""),
    rawDescription: String(line.rawDescription || line.raw_description || line.description || ""),
    hardware: Array.isArray(line.hardware) ? line.hardware : [],
    confidence: Number.isFinite(Number(line.confidence)) ? Number(line.confidence) : 0,
    humanReviewRequired: Boolean(
      line.humanReviewRequired ||
      !String(line.rawDescription || line.raw_description || line.description || "").trim(),
    ),
  }));
  value.adjustments = Array.isArray(value.adjustments) ? value.adjustments : [];
  value.paymentMilestones = Array.isArray(value.paymentMilestones) ? value.paymentMilestones : [];
  value.missingInformation = Array.isArray(value.missingInformation)
    ? value.missingInformation
    : [];
  value.conflicts = Array.isArray(value.conflicts) ? value.conflicts : [];
  const hasIdentity = Boolean(
    value.reference ||
    value.docDate ||
    value.buyer?.name ||
    value.supplier?.name ||
    value.project?.name ||
    value.totalCentavos != null ||
    value.financialSummary?.totalCentavos != null,
  );
  if (!value.lines.length && !hasIdentity)
    throw new Error("empty extraction contained no document identity or line items");
  if (value.lines.length && !value.lines.some((line: any) => line.rawDescription.trim()))
    throw new Error("extracted line items contained no readable descriptions");
  return value;
}

/** Recover a structured extraction from clean JSON, fenced JSON, or prose-wrapped JSON. */
export function parseExtractionText(text: string) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```\s*$/, "")
    .trim();
  const candidates = [clean, ...balancedJsonObjects(clean)];
  let lastError: unknown = new Error("no JSON object found");
  for (const candidate of [...new Set(candidates)]) {
    if (!candidate) continue;
    try {
      return normalizeExtraction(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(lastError instanceof Error ? lastError.message : String(lastError));
}

export function extractionNeedsReview(expectedType: string | undefined, reason: string) {
  const safeReason = reason.replace(/\s+/g, " ").trim().slice(0, 500);
  return {
    docType: "unknown",
    reference: null,
    docDate: null,
    expectedDate: null,
    mrsNumber: null,
    prNumber: null,
    prsNumber: null,
    paymentTerms: null,
    paymentMilestones: [],
    deliverySchedule: null,
    contractType: null,
    warranty: null,
    serviceScope: null,
    memo: null,
    transactionId: null,
    supplier: {},
    buyer: {},
    project: {},
    instructions: null,
    lines: [],
    adjustments: [],
    financialSummary: {
      subtotalCentavos: null,
      amountWithoutTaxCentavos: null,
      vatCentavos: null,
      totalCentavos: null,
    },
    totalCentavos: null,
    missingInformation: ["TALA could not produce valid structured extraction data."],
    conflicts: [
      `${expectedType ? `Opened from ${expectedType} intake; document type remains unconfirmed. ` : ""}${safeReason || "The extraction response could not be parsed."}`,
    ],
  };
}
