import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TALA_INTENTS, type TalaIntent } from "@/lib/agent-quick-actions";
import { normalizeOpenRouterApiKey, openRouterAuthorization } from "@/lib/openrouter-auth";
import { normalizeOpenRouterModels } from "@/lib/openrouter-models";
import { extractionNeedsReview, parseExtractionText } from "@/lib/extraction-json";
import { invokeTalaEdge, isMissingTalaEdge } from "@/lib/tala-edge";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const SESSION_KEY = "azarraga_openrouter_api_key";

// ============================================================
// IMPROVED EXTRACTION PROMPTS - Specific to glass/aluminum
// ============================================================

const systemRules = `You are TALA, the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.

**CRITICAL RULES:**
1. Use ONLY the live commercial context provided. Never invent data.
2. A customer's purchase order is an order RECEIVED by Azarraga, never an Azarraga invoice.
3. Preserve raw descriptions, opening codes, systems, glass, frames, dimensions, quantities and services.
4. Historical prices are evidence only. Identify the exact source reference and date for every historical price.
5. Amounts ending in _centavos are integer PHP centavos.
6. If information is absent, explicitly say it is absent.
7. For glass/aluminum products, extract ALL specifications including: thickness, type, color, frame, hardware.`;

// ============================================================
// ENHANCED EXTRACTION RULES - Better OCR for invoices, leads, quotes
// ============================================================

const extractionRules = `You are TALA, the Azarraga Commercial Document Extractor for glass, doors, and aluminum products.

**EXTRACT EVERY FIELD WITH MAXIMUM ACCURACY:**

For ALL documents, extract:
- Document type: purchase_order | invoice | quotation | lead | supplier_quote
- Reference/Number: PO-XXXXX, INV-XXXXX, Q-XXXXX
- Date: Philippine format (MM/DD/YYYY or DD-MM-YYYY)
- Customer: name, company, address, contact person, email, phone, TIN
- Project: name, location, description
- Products/Line items: ALL visible items with their specs

For GLASS/ALUMINUM products, extract these SPECIFIC fields:
- GLASS: thickness (mm), type (tempered/annealed/laminated), color (clear/bronze/gray/blue), dimensions
- FRAME: material (aluminum/stainless/wood), finish (analok/painted/anodized)
- SYSTEM: sliding/swing/frameless/fixed/bi-fold/awning/casement
- HARDWARE: handles, hinges, locks, rollers, tracks
- DIMENSIONS: width_mm, height_mm, thickness_mm
- QUANTITY: number of units (doors, windows, panels)
- UNIT PRICE: PHP per unit (convert to centavos)
- TOTAL: PHP total (convert to centavos)

For LEADS, extract:
- Project name, location, description
- Contact: name, phone, email, company
- Requirements: glass type, door type, aluminum specs, quantity
- Budget range (if mentioned)

For QUOTES, extract:
- Quote number, date, customer, project
- ALL line items with descriptions, quantities, prices
- Payment terms, delivery terms, validity period
- Subtotal, tax, total

For INVOICES, extract:
- Invoice number, date, customer, project
- ALL line items with descriptions, quantities, prices
- Payment terms, due date
- Subtotal, tax, total, balance

Return ONLY valid JSON with this structure:
{
  "docType": "purchase_order|invoice|quotation|lead|supplier_quote|unknown",
  "reference": null,
  "docDate": null,
  "expectedDate": null,
  "customer": {
    "name": null,
    "company": null,
    "address": null,
    "contact": null,
    "email": null,
    "phone": null,
    "tin": null
  },
  "project": {
    "name": null,
    "location": null,
    "description": null
  },
  "lines": [
    {
      "lineNo": 1,
      "rawDescription": null,
      "quantity": 0,
      "unit": "pc",
      "unitPriceCentavos": 0,
      "amountCentavos": 0,
      "productFamily": null,
      "system": null,
      "glass": null,
      "glassThicknessMm": null,
      "glassType": null,
      "glassColor": null,
      "frame": null,
      "frameColor": null,
      "widthMm": null,
      "heightMm": null,
      "hardware": [],
      "confidence": 1,
      "humanReviewRequired": false
    }
  ],
  "financialSummary": {
    "subtotalCentavos": null,
    "taxCentavos": null,
    "totalCentavos": null,
    "balanceCentavos": null
  },
  "paymentTerms": null,
  "deliveryTerms": null,
  "validityPeriod": null,
  "notes": null,
  "missingInformation": [],
  "conflicts": [],
  "extractionModel": null
}

**CRITICAL:** 
- Amounts MUST be in integer centavos (₱1,000.00 = 100000 centavos)
- If ANY field cannot be extracted, return null - NEVER invent data
- If confidence is low, set confidence < 1 and humanReviewRequired: true
- Preserve raw descriptions exactly as they appear

**DO NOT** include markdown, explanations, or text outside the JSON object.`;

// ============================================================
// SESSION KEY MANAGEMENT
// ============================================================

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

// ============================================================
// MODEL LISTING
// ============================================================

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
  if (!hasOpenRouterSessionKey()) {
    try {
      return await invokeTalaEdge<any>("tala-agent", { action: "models" });
    } catch (error) {
      if (!isMissingTalaEdge(error)) throw error;
    }
  }
  const result: any = await listAgentModelsServer();
  return {
    ...result,
    secretConfigured: result.secretConfigured || hasOpenRouterSessionKey(),
    error:
      result.secretConfigured || hasOpenRouterSessionKey()
        ? result.error
        : "TALA service is not deployed. A pasted session key can be used until deployment completes.",
  };
}

// ============================================================
// IMPROVED ASK AGENT
// ============================================================

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
  if (!hasOpenRouterSessionKey()) {
    return invokeTalaEdge("tala-agent", { action: "chat", ...data });
  }
  return askAgentServer({ data: { ...data, apiKey: sessionKey() || undefined } });
}

// ============================================================
// IMPROVED EXTRACT COMMERCIAL DOCUMENT - ENHANCED OCR
// ============================================================

const ExtractInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(1),
  expectedType: z
    .enum(["purchase_order", "invoice", "quotation", "receipt", "supplier_quote", "lead", "unknown"])
    .optional(),
  apiKey: z.string().optional(),
  retryCount: z.number().default(0),
});

function openRouterMessageText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) =>
      typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "",
    )
    .filter(Boolean)
    .join("\n");
}

type ExtractionModel = { id: string; structured: boolean; cost: "free" | "paid" };

async function discoverExtractionModels(
  key: string,
  mimeType: string,
  preferredModel?: string | null,
  freeOnly = true,
): Promise<ExtractionModel[]> {
  try {
    const query = mimeType.startsWith("image/") ? "?input_modalities=image" : "";
    const response = await fetch(`${OPENROUTER_MODELS}${query}`, {
      headers: { Authorization: openRouterAuthorization(key), Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`model discovery returned ${response.status}`);
    
    const payload: any = await response.json();
    const compatible = (Array.isArray(payload?.data) ? payload.data : [])
      .filter((model: any) => {
        const promptPrice = Number(model?.pricing?.prompt ?? 0);
        const completionPrice = Number(model?.pricing?.completion ?? 0);
        const free = promptPrice === 0 && completionPrice === 0;
        const modalities = Array.isArray(model?.architecture?.input_modalities)
          ? model.architecture.input_modalities
          : String(model?.architecture?.modality || "").split("->");
        const acceptsInput = mimeType.startsWith("image/")
          ? modalities.some((item: string) => String(item).toLowerCase().includes("image"))
          : true;
        return model?.id && acceptsInput && (!freeOnly || free);
      })
      .map((model: any) => {
        const parameters = Array.isArray(model.supported_parameters)
          ? model.supported_parameters
          : [];
        const structured = parameters.some((parameter: string) =>
          ["response_format", "structured_outputs"].includes(parameter),
        );
        const preferred = model.id === preferredModel;
        const googleVision = /google\/(gemini|gemma)/i.test(model.id);
        const openaiVision = /openai\/gpt-4/i.test(model.id);
        const anthropicVision = /anthropic\/claude-3/i.test(model.id);
        const promptPrice = Number(model?.pricing?.prompt ?? 0);
        const completionPrice = Number(model?.pricing?.completion ?? 0);
        const free = promptPrice === 0 && completionPrice === 0;
        
        return {
          id: String(model.id),
          structured,
          cost: free ? "free" : "paid",
          score:
            (preferred ? 1_000_000_000 : 0) +
            (structured ? 100_000_000 : 0) +
            (googleVision ? 10_000_000 : 0) +
            (openaiVision ? 5_000_000 : 0) +
            (anthropicVision ? 3_000_000 : 0) +
            Number(model.context_length || 0),
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5) // Try up to 5 models
      .map(({ id, structured, cost }: any) => ({ id, structured, cost }));
    
    const unique = new Map<string, ExtractionModel>();
    for (const model of compatible) unique.set(model.id, model);
    
    // Always include a fallback
    if (!unique.has("openrouter/free")) {
      unique.set("openrouter/free", { id: "openrouter/free", structured: false, cost: "free" });
    }
    
    // Include a paid vision model if available
    if (!unique.has("google/gemini-2.0-flash-exp")) {
      unique.set("google/gemini-2.0-flash-exp", { 
        id: "google/gemini-2.0-flash-exp", 
        structured: true, 
        cost: "paid" 
      });
    }
    
    return [...unique.values()];
  } catch {
    return [
      { id: "openrouter/free", structured: false, cost: "free" },
      { id: "google/gemini-2.0-flash-exp", structured: true, cost: "paid" },
    ];
  }
}

// ============================================================
// IMPROVED EXTRACTION WITH RETRY AND FALLBACK
// ============================================================

const extractCommercialDocumentServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = serverKey(data.apiKey);
    if (!key) throw new Error("Paste your OpenRouter API key in Agent Settings first");
    
    if (!data.mimeType.startsWith("image/") && data.mimeType !== "application/pdf")
      throw new Error("Only image and PDF documents are supported");
    
    // Get user settings for model preferences
    const { data: settings } = await context.supabase
      .from("agent_settings")
      .select("model,free_models_only")
      .eq("id", 1)
      .maybeSingle();
    
    const extractionModels = await discoverExtractionModels(
      key,
      data.mimeType,
      settings?.model,
      settings?.free_models_only !== false,
    );
    
    const media = data.mimeType.startsWith("image/")
      ? { type: "image_url", image_url: { url: data.dataUrl } }
      : { type: "file", file: { filename: data.fileName, file_data: data.dataUrl } };
    
    // ============================================================
    // REQUEST EXTRACTION WITH RETRY LOGIC
    // ============================================================
    
    const requestExtraction = async (model: ExtractionModel, attempt = 1) => {
      const isRetry = attempt > 1;
      const maxRetries = 3;
      
      const payload = {
        model: model.id,
        messages: [
          {
            role: "system",
            content: model.structured
              ? `${extractionRules}\nCRITICAL RETRY ${attempt}/${maxRetries}: Output exactly one valid JSON object. No markdown, no explanations, no text outside the JSON.`
              : extractionRules,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read ${data.fileName}. Extract EVERY visible field and line item. The document is: ${data.expectedType || "general document"}. 
                
                ${isRetry ? `⚠️ PREVIOUS ATTEMPT FAILED. Double-check your extraction. Ensure valid JSON.` : ""}
                
                For glass/aluminum products, extract: glass thickness, type, color, frame, hardware, dimensions, quantities, prices.`,
              },
              media,
            ],
          },
        ],
        ...(model.structured
          ? {
              response_format: { type: "json_object" },
              provider: { require_parameters: true, allow_fallbacks: true },
            }
          : {}),
        ...(data.mimeType === "application/pdf"
          ? { plugins: [{ id: "file-parser", pdf: { engine: "cloudflare-ai" } }] }
          : {}),
        temperature: 0,
        max_tokens: 12000,
      };
      
      const response = await fetch(OPENROUTER_CHAT, {
        method: "POST",
        headers: {
          Authorization: openRouterAuthorization(key),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const raw = await response.text();
      let result: any;
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(`OpenRouter returned a non-JSON API response (${response.status})`);
      }
      
      if (!response.ok) {
        const errorMsg = result?.error?.message || `OpenRouter returned ${response.status}`;
        throw new Error(errorMsg);
      }
      
      const content = openRouterMessageText(result?.choices?.[0]?.message?.content);
      if (!content) throw new Error("TALA returned no extraction content");
      
      return { content, modelId: model.id };
    };
    
    // ============================================================
    // TRY MULTIPLE MODELS WITH RETRIES
    // ============================================================
    
    const failures: string[] = [];
    
    for (const model of extractionModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { content, modelId } = await requestExtraction(model, attempt);
          
          // Parse the extraction
          const parsed = parseExtractionText(content);
          
          // Add extraction model info
          parsed.extractionModel = modelId;
          
          // If this is a paid model and extraction looks good, return it
          if (model.cost === "paid" && parsed.lines?.length > 0) {
            return parsed;
          }
          
          // If free model, still use it if it has data
          if (parsed.lines?.length > 0) {
            return parsed;
          }
          
          // If no lines but we have customer data, still return
          if (parsed.customer?.name || parsed.reference) {
            failures.push(`${model.id}: extracted ${parsed.lines?.length || 0} items`);
            continue;
          }
          
          failures.push(`${model.id}: no useful data extracted`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          failures.push(`${model.id}: ${errorMsg}`);
        }
      }
    }
    
    // ============================================================
    // FINAL FALLBACK - USE DOCUMENT SUMMARY
    // ============================================================
    
    // If all models fail, create a review document with what we know
    return extractionNeedsReview(
      data.expectedType,
      `All extraction attempts failed. ${failures.join(" | ")}. Please review the original document manually.`,
    );
  });

// ============================================================
// EXPORT EXTRACT FUNCTION
// ============================================================

export async function extractCommercialDocument({
  data,
}: {
  data: {
    clientDocumentId?: string;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
    expectedType?: 
      "purchase_order" | "invoice" | "quotation" | "receipt" | "supplier_quote" | "lead" | "unknown";
  };
}) {
  // Use edge function if no session key
  if (!hasOpenRouterSessionKey()) {
    if (!data.clientDocumentId)
      throw new Error("Save the document before requesting secure TALA extraction");
    return invokeTalaEdge("tala-document-extract", {
      clientDocumentId: data.clientDocumentId,
      expectedType: data.expectedType,
    });
  }
  
  // Use OpenRouter directly
  if (!data.fileName || !data.mimeType || !data.dataUrl)
    throw new Error("Document bytes are required when using a temporary session key");
  
  return extractCommercialDocumentServer({
    data: {
      fileName: data.fileName,
      mimeType: data.mimeType,
      dataUrl: data.dataUrl,
      expectedType: data.expectedType,
      apiKey: sessionKey() || undefined,
      retryCount: 0,
    },
  });
}
