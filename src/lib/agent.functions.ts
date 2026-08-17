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

const ExtractInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(1),
  expectedType: z
    .enum(["purchase_order", "invoice", "quotation", "receipt", "supplier_quote", "unknown"])
    .optional(),
  apiKey: z.string().optional(),
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

type ExtractionModel = { id: string; structured: boolean };

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
        return {
          id: String(model.id),
          structured,
          score:
            (preferred ? 1_000_000_000 : 0) +
            (structured ? 100_000_000 : 0) +
            (googleVision ? 10_000_000 : 0) +
            Number(model.context_length || 0),
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 4)
      .map(({ id, structured }: any) => ({ id, structured }));
    const unique = new Map<string, ExtractionModel>();
    for (const model of compatible) unique.set(model.id, model);
    if (!unique.size) unique.set("openrouter/free", { id: "openrouter/free", structured: false });
    return [...unique.values()];
  } catch {
    return [{ id: "openrouter/free", structured: false }];
  }
}

const extractCommercialDocumentServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ExtractInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = serverKey(data.apiKey);
    if (!key) throw new Error("Paste your OpenRouter API key in Agent Settings first");
    if (!data.mimeType.startsWith("image/") && data.mimeType !== "application/pdf")
      throw new Error("Only image and PDF documents are supported");
    const media = data.mimeType.startsWith("image/")
      ? { type: "image_url", image_url: { url: data.dataUrl } }
      : { type: "file", file: { filename: data.fileName, file_data: data.dataUrl } };
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
    const requestExtraction = async (model: ExtractionModel) => {
      const response = await fetch(OPENROUTER_CHAT, {
        method: "POST",
        headers: {
          Authorization: openRouterAuthorization(key),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            {
              role: "system",
              content: model.structured
                ? `${extractionRules}\nCRITICAL RETRY: Output exactly one valid JSON object. Do not include safety labels, analysis, markdown or prose before or after it.`
                : extractionRules,
            },
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
        }),
      });
      const raw = await response.text();
      let result: any;
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(`OpenRouter returned a non-JSON API response (${response.status})`);
      }
      if (!response.ok)
        throw new Error(result?.error?.message || `OpenRouter returned ${response.status}`);
      const content = openRouterMessageText(result?.choices?.[0]?.message?.content);
      if (!content) throw new Error("TALA returned no extraction content");
      return content;
    };
    const failures: string[] = [];
    for (const model of extractionModels) {
      try {
        const content = await requestExtraction(model);
        const parsed = parseExtractionText(content);
        parsed.extractionModel = model.id;
        return parsed;
      } catch (error) {
        failures.push(`${model.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return extractionNeedsReview(
      data.expectedType,
      `All compatible extraction models failed. ${failures.join(" | ")}`,
    );
  });

export async function extractCommercialDocument({
  data,
}: {
  data: {
    clientDocumentId?: string;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
    expectedType?:
      "purchase_order" | "invoice" | "quotation" | "receipt" | "supplier_quote" | "unknown";
  };
}) {
  if (!hasOpenRouterSessionKey()) {
    if (!data.clientDocumentId)
      throw new Error("Save the document before requesting secure TALA extraction");
    return invokeTalaEdge("tala-document-extract", {
      clientDocumentId: data.clientDocumentId,
      expectedType: data.expectedType,
    });
  }
  if (!data.fileName || !data.mimeType || !data.dataUrl)
    throw new Error("Document bytes are required when using a temporary session key");
  return extractCommercialDocumentServer({
    data: {
      fileName: data.fileName,
      mimeType: data.mimeType,
      dataUrl: data.dataUrl,
      expectedType: data.expectedType,
      apiKey: sessionKey() || undefined,
    },
  });
}
