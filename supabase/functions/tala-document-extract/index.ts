// ============================================================
// TALA DOCUMENT EXTRACT EDGE FUNCTION
// Reads a private Storage document and extracts every commercial
// field with an OpenRouter vision model. Returns the extraction
// object itself so the app's learning path can persist it.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";

// Vision-capable models, best first. Every id below is a real OpenRouter model.
const VISION_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o-mini",
  "qwen/qwen2.5-vl-72b-instruct",
];

const extractionRules = `You are TALA, the Azarraga Commercial Document Extractor for glass, doors and aluminum products.

Read the attached document (invoice, purchase order, quotation, receipt or supplier quote) and extract EVERY visible field.

Extract for all documents:
- Document type: purchase_order | invoice | quotation | receipt | supplier_quote
- Reference/number, document date, expected/delivery date, MRS/PR number, payment terms, delivery schedule, memo, transaction id, special instructions
- Supplier/seller (the party issuing goods): name, address, TIN, contact person, email, phone
- Buyer/customer (the party being billed): name, business style/company, address, TIN, contact person, email, phone
- Project: name, location
- Every line item, in printed order
- Non-product charges (crating, shipping, trucking, delivery, installation, discount) as "adjustments", NOT as product lines

For glass / aluminum lines extract: opening code, product family (Jalousie, Door, Window, Railing, Shower, Fixed Glass...),
system (sliding/swing/frameless/fixed/bi-fold/awning/casement), configuration, glass thickness in mm, glass type
(tempered/annealed/laminated), glass color, frame color, hardware, width_mm, height_mm (convert metres like 0.60x1.35 to 600 x 1350),
raw dimensions as printed, quantity, unit, unit price, VAT, amount.

Return ONLY one valid JSON object:
{
  "docType": "purchase_order|invoice|quotation|receipt|supplier_quote|unknown",
  "reference": null,
  "docDate": null,
  "expectedDate": null,
  "mrsNumber": null,
  "prNumber": null,
  "paymentTerms": null,
  "paymentMilestones": [],
  "deliverySchedule": null,
  "memo": null,
  "transactionId": null,
  "instructions": null,
  "supplier": { "name": null, "address": null, "tin": null, "contactPerson": null, "email": null, "phone": null },
  "buyer": { "name": null, "businessStyle": null, "address": null, "tin": null, "contactPerson": null, "email": null, "phone": null },
  "project": { "name": null, "location": null },
  "lines": [
    { "lineNo": 1, "openingCode": null, "rawDescription": "", "quantity": 0, "unit": "pc",
      "unitPriceCentavos": 0, "vatCentavos": null, "amountCentavos": 0, "productFamily": null, "system": null,
      "configuration": null, "glassThicknessMm": null, "glassType": null, "glassColor": null,
      "frameColor": null, "widthMm": null, "heightMm": null, "rawDimensions": null, "class": null,
      "hardware": [], "confidence": 1, "humanReviewRequired": false }
  ],
  "adjustments": [
    { "type": "CRATING|SHIPPING|TRUCKING|DELIVERY|INSTALLATION|DISCOUNT|OTHER", "description": "", "amountCentavos": 0, "rawText": null }
  ],
  "financialSummary": { "subtotalCentavos": null, "amountWithoutTaxCentavos": null, "vatCentavos": null, "totalCentavos": null },
  "missingInformation": [],
  "conflicts": []
}

CRITICAL:
- All money is INTEGER CENTAVOS (PHP 1,000.00 = 100000).
- Never invent data. Unknown fields are null.
- Preserve raw descriptions exactly as printed.
- Set confidence < 1 and humanReviewRequired true when a line is uncertain.
- No markdown, no commentary outside the JSON object.`;

// ---------------- JSON recovery ----------------

function balancedJsonObjects(text: string) {
  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (c === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects.sort((a, b) => b.length - a.length);
}

const str = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text && text !== "null" && text !== "undefined" ? text : null;
};
const num = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

function normalizeExtraction(value: any) {
  if (!value || typeof value !== "object") throw new Error("missing extraction object");
  const lines = Array.isArray(value.lines) ? value.lines : [];
  value.lines = lines.map((line: any, index: number) => {
    const description = str(line.rawDescription ?? line.raw_description ?? line.description) || "";
    const quantity = num(line.quantity) ?? 0;
    const unitPrice = num(line.unitPriceCentavos, line.unit_price_centavos) ?? 0;
    const amount = num(line.amountCentavos, line.amount_centavos) ?? Math.round(quantity * unitPrice);
    return {
      ...line,
      lineNo: num(line.lineNo, line.line_no) ?? index + 1,
      openingCode: str(line.openingCode ?? line.opening_code),
      rawDescription: description,
      description,
      quantity,
      unit: str(line.unit) || "pc",
      unitPriceCentavos: unitPrice,
      amountCentavos: amount,
      productFamily: str(line.productFamily ?? line.product_family),
      system: str(line.system),
      glass: str(line.glass),
      glassThicknessMm: num(line.glassThicknessMm, line.glass_thickness_mm),
      glassType: str(line.glassType ?? line.glass_type),
      glassColor: str(line.glassColor ?? line.glass_color),
      frame: str(line.frame),
      frameColor: str(line.frameColor ?? line.frame_color),
      widthMm: num(line.widthMm, line.width_mm),
      heightMm: num(line.heightMm, line.height_mm),
      hardware: Array.isArray(line.hardware) ? line.hardware : [],
      confidence: num(line.confidence) ?? 1,
      humanReviewRequired: Boolean(line.humanReviewRequired) || !description,
    };
  });
  value.adjustments = Array.isArray(value.adjustments) ? value.adjustments : [];
  value.paymentMilestones = Array.isArray(value.paymentMilestones) ? value.paymentMilestones : [];
  value.missingInformation = Array.isArray(value.missingInformation) ? value.missingInformation : [];
  value.conflicts = Array.isArray(value.conflicts) ? value.conflicts : [];
  value.customer = value.customer && typeof value.customer === "object" ? value.customer : {};
  value.supplier = value.supplier && typeof value.supplier === "object" ? value.supplier : {};
  value.project = value.project && typeof value.project === "object" ? value.project : {};
  value.financialSummary =
    value.financialSummary && typeof value.financialSummary === "object"
      ? value.financialSummary
      : {};
  value.docType = str(value.docType ?? value.doc_type) || "unknown";
  value.reference = str(value.reference);
  value.docDate = str(value.docDate ?? value.doc_date);
  value.totalCentavos = num(value.totalCentavos, value.financialSummary?.totalCentavos);

  const hasIdentity = Boolean(
    value.reference ||
      value.docDate ||
      str(value.customer?.name) ||
      str(value.supplier?.name) ||
      str(value.project?.name) ||
      value.financialSummary?.totalCentavos != null,
  );
  if (!value.lines.length && !hasIdentity)
    throw new Error("empty extraction contained no document identity or line items");
  return value;
}

function parseExtractionText(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  const candidates = [cleaned, ...balancedJsonObjects(cleaned)];
  let lastError: unknown = new Error("no JSON object found");
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return normalizeExtraction(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Chunked base64 so multi-megabyte scans do not blow the call stack.
function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) => (typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(
      authorization.slice(7),
    );
    if (userError || !userData.user) return respond({ error: "Unauthorized" }, 401);

    const key = Deno.env.get("OPENROUTER_API_KEY");
    if (!key) return respond({ error: "OPENROUTER_API_KEY is missing from project secrets" }, 503);

    const body = await req.json().catch(() => ({}));
    const clientDocumentId = String(body?.clientDocumentId || "");
    const expectedType = str(body?.expectedType);
    if (!clientDocumentId) return respond({ error: "clientDocumentId is required" }, 400);

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", {
      auth: { persistSession: false },
    });

    const { data: doc, error: docError } = await service
      .from("client_documents")
      .select("id,bucket,storage_path,title,mime_type,file_size")
      .eq("id", clientDocumentId)
      .maybeSingle();
    if (docError || !doc) return respond({ error: "Document not found" }, 404);

    const { data: file, error: fileError } = await service.storage
      .from(doc.bucket)
      .download(doc.storage_path);
    if (fileError || !file)
      return respond({ error: `Failed to read stored document: ${fileError?.message}` }, 500);

    const mimeType = doc.mime_type || "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${toBase64(await file.arrayBuffer())}`;
    const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(doc.title || "");
    const media = isPdf
      ? { type: "file", file: { filename: doc.title || "document.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

    const failures: string[] = [];
    for (const model of VISION_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await fetch(OPENROUTER_CHAT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": supabaseUrl,
              "X-Title": "Azarraga Commercial Agent",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: extractionRules },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Read ${doc.title || "this document"} and extract every visible field and line item.${
                        expectedType ? ` Expected document type: ${expectedType}.` : ""
                      }${attempt > 1 ? " The previous attempt was not valid JSON — return one valid JSON object only." : ""}`,
                    },
                    media,
                  ],
                },
              ],
              response_format: { type: "json_object" },
              ...(isPdf
                ? { plugins: [{ id: "file-parser", pdf: { engine: "pdf-text" } }] }
                : {}),
              temperature: 0,
              max_tokens: 16000,
            }),
          });

          const raw = await response.text();
          let result: any;
          try {
            result = JSON.parse(raw);
          } catch {
            throw new Error(`non-JSON API response (${response.status})`);
          }
          if (!response.ok)
            throw new Error(result?.error?.message || `OpenRouter returned ${response.status}`);

          const content = textContent(result?.choices?.[0]?.message?.content);
          if (!content) throw new Error("no extraction content returned");

          const extraction = parseExtractionText(content);
          extraction.extractionModel = model;
          if (expectedType && extraction.docType === "unknown") extraction.docType = expectedType;
          return respond(extraction);
        } catch (error) {
          failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return respond(
      {
        error: `TALA could not extract this document. ${failures.join(" | ")}`,
      },
      502,
    );
  } catch (error) {
    console.error("[TALA extract]", error);
    return respond(
      { error: error instanceof Error ? error.message : "Unexpected extraction failure" },
      500,
    );
  }
});
