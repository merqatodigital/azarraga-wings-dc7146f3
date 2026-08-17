// ============================================================
// IMPROVED JSON PARSING WITH MULTIPLE STRATEGIES
// ============================================================

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

function extractJsonWithPrefix(text: string): string[] {
  const results: string[] = [];
  const patterns = [
    /(?:json|extraction|result|data)[\s:]+(\{[\s\S]*\})/i,
    /(\{[\s\S]*\})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      results.push(match[1]);
    }
  }
  return results;
}

function salvageExtraction(text: string): any {
  // Try to extract key fields with regex
  const docTypeMatch = text.match(/(?:docType|document type|type)[\s:]+["']?([a-z_]+)["']?/i);
  const refMatch = text.match(/(?:reference|number|document no|invoice no|po no|quote no)[\s:]+["']?([A-Z0-9-]+)["']?/i);
  const dateMatch = text.match(/(?:date|doc date|invoice date|po date)[\s:]+["']?([0-9/ -]+)["']?/i);
  const customerMatch = text.match(/(?:customer|client|buyer)[\s:]+["']?([^"\n,]+)["']?/i);
  const totalMatch = text.match(/(?:total|amount due|grand total)[\s:]+["']?([0-9,.]+)["']?/i);
  const companyMatch = text.match(/(?:company|business)[\s:]+["']?([^"\n,]+)["']?/i);
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const phoneMatch = text.match(/(?:0[0-9]{10}|[0-9]{4}[0-9]{7})/i);

  if (!docTypeMatch && !refMatch && !customerMatch) return null;

  return {
    docType: docTypeMatch?.[1] || 'unknown',
    reference: refMatch?.[1] || null,
    docDate: dateMatch?.[1] || null,
    customer: {
      name: customerMatch?.[1] || null,
      company: companyMatch?.[1] || null,
      email: emailMatch?.[1] || null,
      phone: phoneMatch?.[1] || null,
    },
    lines: [],
    financialSummary: { 
      totalCentavos: totalMatch ? Math.round(parseFloat(totalMatch[1].replace(/,/g, '')) * 100) : null 
    },
    missingInformation: ["Extraction was partially recovered from text. Review the original document."],
    conflicts: [],
    extractionModel: "salvaged",
  };
}

function normalizeExtraction(value: any) {
  if (!value || typeof value !== "object") throw new Error("missing extraction object");
  if (!Array.isArray(value.lines)) throw new Error("missing line-item array");
  
  value.lines = value.lines.map((line: any, index: number) => ({
    ...line,
    lineNo: Number(line.lineNo) || index + 1,
    quantity: Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0,
    unit: String(line.unit || "pc"),
    rawDescription: String(line.rawDescription || line.raw_description || line.description || ""),
    productFamily: String(line.productFamily || line.product_family || null) || null,
    system: String(line.system || null) || null,
    glass: String(line.glass || null) || null,
    glassThicknessMm: Number.isFinite(Number(line.glassThicknessMm || line.glass_thickness_mm)) 
      ? Number(line.glassThicknessMm || line.glass_thickness_mm) 
      : null,
    glassType: String(line.glassType || line.glass_type || null) || null,
    glassColor: String(line.glassColor || line.glass_color || null) || null,
    frame: String(line.frame || null) || null,
    frameColor: String(line.frameColor || line.frame_color || null) || null,
    widthMm: Number.isFinite(Number(line.widthMm || line.width_mm)) 
      ? Number(line.widthMm || line.width_mm) 
      : null,
    heightMm: Number.isFinite(Number(line.heightMm || line.height_mm)) 
      ? Number(line.heightMm || line.height_mm) 
      : null,
    hardware: Array.isArray(line.hardware) ? line.hardware : [],
    unitPriceCentavos: Number.isFinite(Number(line.unitPriceCentavos || line.unit_price_centavos)) 
      ? Number(line.unitPriceCentavos || line.unit_price_centavos) 
      : 0,
    amountCentavos: Number.isFinite(Number(line.amountCentavos || line.amount_centavos)) 
      ? Number(line.amountCentavos || line.amount_centavos) 
      : 0,
    confidence: Number.isFinite(Number(line.confidence)) ? Number(line.confidence) : 1,
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
  
  // Ensure customer object exists
  if (!value.customer) value.customer = {};
  if (!value.project) value.project = {};
  if (!value.financialSummary) value.financialSummary = {};
  
  const hasIdentity = Boolean(
    value.reference ||
    value.docDate ||
    value.customer?.name ||
    value.project?.name ||
    value.financialSummary?.totalCentavos != null,
  );
  
  if (!value.lines.length && !hasIdentity) {
    throw new Error("empty extraction contained no document identity or line items");
  }
  
  // If we have lines but no descriptions, flag for review
  if (value.lines.length && !value.lines.some((line: any) => line.rawDescription.trim())) {
    value.missingInformation.push("Extracted lines have no readable descriptions");
    value.lines.forEach((line: any) => {
      line.humanReviewRequired = true;
    });
  }
  
  // Validate totals
  const calculatedTotal = value.lines.reduce((sum: number, line: any) => 
    sum + (Number(line.amountCentavos) || 0), 0
  );
  
  const statedTotal = value.financialSummary?.totalCentavos;
  
  if (statedTotal != null && Math.abs(calculatedTotal - Number(statedTotal)) > 1) {
    value.conflicts.push(`Calculated total (${calculatedTotal} centavos) differs from stated total (${statedTotal} centavos)`);
    value.humanReviewRequired = true;
  }
  
  return value;
}

// ============================================================
// MAIN PARSE FUNCTION
// ============================================================

export function parseExtractionText(text: string) {
  // Clean the text
  let cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();

  // Try multiple parsing strategies
  const candidates = [
    cleaned,
    ...balancedJsonObjects(cleaned),
    ...extractJsonWithPrefix(cleaned),
  ];

  let lastError: unknown = new Error('no JSON object found');
  
  for (const candidate of [...new Set(candidates)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      return normalizeExtraction(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  // Try to salvage data from the text
  const salvaged = salvageExtraction(cleaned);
  if (salvaged) {
    return normalizeExtraction(salvaged);
  }

  throw new Error(lastError instanceof Error ? lastError.message : String(lastError));
}

// ============================================================
// REVIEW DOCUMENT FOR FAILED EXTRACTIONS
// ============================================================

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
    customer: {},
    project: {},
    lines: [],
    adjustments: [],
    financialSummary: {
      subtotalCentavos: null,
      taxCentavos: null,
      totalCentavos: null,
    },
    totalCentavos: null,
    missingInformation: ["TALA could not produce valid structured extraction data."],
    conflicts: [
      `${expectedType ? `Opened from ${expectedType} intake; document type remains unconfirmed. ` : ""}${safeReason || "The extraction response could not be parsed."}`,
    ],
    extractionModel: "failed",
    humanReviewRequired: true,
  };
}
