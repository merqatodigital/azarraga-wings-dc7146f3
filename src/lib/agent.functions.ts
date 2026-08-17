import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TALA_INTENTS, type TalaIntent } from "@/lib/agent-quick-actions";
import { normalizeOpenRouterApiKey, openRouterAuthorization } from "@/lib/openrouter-auth";
import { normalizeOpenRouterModels } from "@/lib/openrouter-models";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const SESSION_KEY = "azarraga_openrouter_api_key";
const systemRules = `You are TALA, the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.
Use only the live commercial context provided. Never invent customers, contacts, documents, items, dimensions or prices.
A customer's purchase order is an order received by Azarraga, never an Azarraga invoice.
Preserve raw descriptions, opening codes, systems, glass, frames, dimensions, quantities and services.
Historical prices are evidence only. Identify the exact source reference and date for every historical price.
Amounts ending in _centavos are integer PHP centavos. If information is absent, explicitly say it is absent.`;
const extractionRules = `Extract every legible field and every line item. Do not summarize or invent. Return JSON only:
{"docType":"purchase_order|invoice|quotation|receipt|supplier_quote|unknown","reference":null,"docDate":null,"expectedDate":null,"mrsNumber":null,"prNumber":null,"prsNumber":null,"paymentTerms":null,"paymentMilestones":[],"deliverySchedule":null,"contractType":null,"warranty":null,"serviceScope":null,"memo":null,"transactionId":null,"supplier":{"name":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"buyer":{"name":null,"businessStyle":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"project":{"name":null,"location":null},"instructions":null,"lines":[{"lineNo":1,"openingCode":null,"quantity":1,"unit":"SET","rawDescription":"","productFamily":null,"system":null,"configuration":null,"glassThicknessMm":null,"glassType":null,"glassColor":null,"frameColor":null,"widthMm":null,"heightMm":null,"rawDimensions":null,"hardware":[],"class":null,"unitPriceCentavos":null,"vatCentavos":null,"amountCentavos":null,"confidence":1,"humanReviewRequired":false}],"adjustments":[],"financialSummary":{"subtotalCentavos":null,"amountWithoutTaxCentavos":null,"vatCentavos":null,"totalCentavos":null},"totalCentavos":null,"missingInformation":[],"conflicts":[]}.
Amounts are integer centavos. Preserve raw descriptions and dimensions. Separate VAT, shipping, delivery, installation and discounts. The issuer/buyer is the customer and TO/vendor is the supplier. A customer's PO to Azarraga is a purchase_order, never an Azarraga invoice. Do not add VAT twice. Flag ambiguity for human review.`;

function sessionKey() {
  return typeof window === "undefined" ? "" : window.sessionStorage.getItem(SESSION_KEY) || "";
}

export function saveOpenRouterSessionKey(value: string) {
  if (typeof window === "undefined") return;
  const key = normalizeOpenRouterApiKey(value);
  if (key) window.sessionStorage.setItem(SESSION_KEY, key);
  else window.sessionStorage.removeItem(SESSION_KEY);
}

export function hasOpenRouterSessionKey() {
  return Boolean(sessionKey());
}

function serverKey(inputKey?: string) {
  const configured =
    typeof process !== "undefined"
      ? (process.env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY
      : undefined;
  return normalizeOpenRouterApiKey(inputKey || configured);
}

const listAgentModelsServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const response = await fetch(OPENROUTER_MODELS, { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok) throw new Error(`OpenRouter models returned ${response.status}`);
    return {
      provider: "openrouter",
      models: normalizeOpenRouterModels(result?.data || []),
      secretConfigured: Boolean(serverKey()),
      error: null,
    };
  });

export async function listAgentModels() {
  const result: any = await listAgentModelsServer();
  return { ...result, secretConfigured: result.secretConfigured || hasOpenRouterSessionKey() };
}

const AskInput = z.object({
  message: z.string().min(1),
  model: z.string().min(1),
  intent: z.enum(TALA_INTENTS).default("general"),
  apiKey: z.string().optional(),
});

const askAgentServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = serverKey(data.apiKey);
    if (!key) throw new Error("Paste your OpenRouter API key in Agent Settings first");
    const tables = [
      "commercial_evidence",
      "quotes",
      "invoices",
      "leads",
      "source_documents",
      "customers",
      "contacts",
      "projects",
      "purchase_orders",
      "items_purchased",
    ] as const;
    const results = await Promise.all(
      tables.map((table) => context.supabase.from(table).select("*").limit(100)),
    );
    const dbError = results.find((result: any) => result.error)?.error;
    if (dbError) throw new Error(`Commercial memory query failed: ${dbError.message}`);
    const commercialContext = Object.fromEntries(
      tables.map((table, index) => [table, results[index]?.data || []]),
    );
    const response = await fetch(OPENROUTER_CHAT, {
      method: "POST",
      headers: {
        Authorization: openRouterAuthorization(key),
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/merqatodigital/azarraga-wings-dc7146f3",
        "X-Title": "Azarraga Commercial Agent",
      },
      body: JSON.stringify({
        model: data.model,
        messages: [
          {
            role: "system",
            content: `${systemRules}\nCurrent intent: ${data.intent}.\nLIVE COMMERCIAL CONTEXT:\n${JSON.stringify(commercialContext)}`,
          },
          { role: "user", content: data.message },
        ],
        temperature: 0.2,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result?.error?.message || `OpenRouter returned ${response.status}`);
    const reply = String(result?.choices?.[0]?.message?.content || "");
    if (!reply) throw new Error("TALA returned no response");
    return { error: null, reply, model: data.model, humanReviewRequired: true };
  });

export async function askAgent({
  data,
}: {
  data: { message: string; model: string; intent: TalaIntent };
}) {
  return askAgentServer({ data: { ...data, apiKey: sessionKey() || undefined } });
}

const ExtractInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(1),
  expectedType: z
    .enum(["purchase_order", "invoice", "quotation", "receipt", "supplier_quote", "unknown"])
    .optional(),
  apiKey: z.string().optional(),
});

function parseExtraction(text: string) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  const value = JSON.parse(clean);
  if (!value || !Array.isArray(value.lines)) throw new Error("missing line-item array");
  value.lines = value.lines.map((line: any, index: number) => ({
    ...line,
    lineNo: Number(line.lineNo) || index + 1,
    quantity: Number(line.quantity),
    unit: String(line.unit || ""),
    rawDescription: String(line.rawDescription || ""),
    hardware: Array.isArray(line.hardware) ? line.hardware : [],
    confidence: Number.isFinite(Number(line.confidence)) ? Number(line.confidence) : 0,
    humanReviewRequired: Boolean(line.humanReviewRequired || !line.rawDescription),
  }));
  value.adjustments = Array.isArray(value.adjustments) ? value.adjustments : [];
  value.paymentMilestones = Array.isArray(value.paymentMilestones) ? value.paymentMilestones : [];
  value.missingInformation = Array.isArray(value.missingInformation)
    ? value.missingInformation
    : [];
  value.conflicts = Array.isArray(value.conflicts) ? value.conflicts : [];
  return value;
}

const extractCommercialDocumentServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data }) => {
    const key = serverKey(data.apiKey);
    if (!key) throw new Error("Paste your OpenRouter API key in Agent Settings first");
    if (!data.mimeType.startsWith("image/") && data.mimeType !== "application/pdf")
      throw new Error("Only image and PDF documents are supported");
    const media = data.mimeType.startsWith("image/")
      ? { type: "image_url", image_url: { url: data.dataUrl } }
      : { type: "file", file: { filename: data.fileName, file_data: data.dataUrl } };
    const response = await fetch(OPENROUTER_CHAT, {
      method: "POST",
      headers: {
        Authorization: openRouterAuthorization(key),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: extractionRules },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read ${data.fileName}. Extract every field and line item. The owner opened this from the ${data.expectedType || "general document"} intake. Use that only as context: preserve the document's actual semantics and never classify a customer purchase order as an invoice.`,
              },
              media,
            ],
          },
        ],
        ...(data.mimeType === "application/pdf"
          ? { plugins: [{ id: "file-parser", pdf: { engine: "cloudflare-ai" } }] }
          : {}),
        temperature: 0,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result?.error?.message || `OpenRouter returned ${response.status}`);
    const content = String(result?.choices?.[0]?.message?.content || "");
    if (!content) throw new Error("TALA returned no extraction content");
    try {
      return parseExtraction(content);
    } catch (error) {
      throw new Error(
        `TALA returned invalid extraction JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

export async function extractCommercialDocument({
  data,
}: {
  data: {
    fileName: string;
    mimeType: string;
    dataUrl: string;
    expectedType?:
      "purchase_order" | "invoice" | "quotation" | "receipt" | "supplier_quote" | "unknown";
  };
}) {
  return extractCommercialDocumentServer({ data: { ...data, apiKey: sessionKey() || undefined } });
}
