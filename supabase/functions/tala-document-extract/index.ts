import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseExtractionText } from "../_shared/extraction-json.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const rules = `Extract every legible field and every line item from this Azarraga Glass & Aluminum commercial document. Do not summarize or invent. Return JSON only:
{"docType":"purchase_order|invoice|quotation|receipt|supplier_quote|unknown","reference":null,"docDate":null,"expectedDate":null,"mrsNumber":null,"prNumber":null,"prsNumber":null,"paymentTerms":null,"paymentMilestones":[{"percent":null,"trigger":null,"rawText":""}],"deliverySchedule":null,"contractType":null,"warranty":null,"serviceScope":null,"memo":null,"transactionId":null,"supplier":{"name":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"buyer":{"name":null,"businessStyle":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"project":{"name":null,"location":null},"instructions":null,"lines":[{"lineNo":1,"openingCode":null,"quantity":1,"unit":"SET","rawDescription":"","productFamily":null,"system":null,"configuration":null,"glassThicknessMm":null,"glassType":null,"glassColor":null,"frameColor":null,"widthMm":null,"heightMm":null,"rawDimensions":null,"hardware":[],"class":null,"unitPriceCentavos":null,"vatCentavos":null,"amountCentavos":null,"confidence":1,"humanReviewRequired":false}],"adjustments":[{"type":"CRATING|SHIPPING|TRUCKING|DELIVERY|INSTALLATION|DISCOUNT|OTHER","description":"","amountCentavos":0,"rawText":""}],"financialSummary":{"subtotalCentavos":null,"amountWithoutTaxCentavos":null,"vatCentavos":null,"totalCentavos":null},"totalCentavos":null,"missingInformation":[],"conflicts":[]}.
Amounts are integer centavos. Preserve exact raw descriptions, scope, instructions and raw dimensions. Normalize dimensions to millimeters only when clearly stated. Preserve opening codes. Separate VAT, crating, shipping, trucking, delivery, installation and discounts from product lines. The document issuer/buyer is the customer account; the party named TO/vendor/supplier is the supplier. A customer's PO addressed to Azarraga is purchase_order, never an Azarraga invoice. Capture business style, TIN, email and phone only when printed. Store PR, PRS and MRS in their matching fields. Preserve payment milestones, delivery schedule, contract type and warranty verbatim. Do not add VAT twice: financialSummary must reflect the printed subtotal/amount without tax/VAT/total, while line amounts remain exactly as printed. If printed line totals and tax presentation are ambiguous, preserve both and add a conflict instead of changing the figures. Unreadable fields are null and listed in missingInformation. Ambiguity requires humanReviewRequired=true.`;

function messageText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) => (typeof part === "string" ? part : String(part?.text || "")))
    .filter(Boolean)
    .join("\n");
}

async function extractionModels(
  key: string,
  mimeType: string,
  preferred: string | null,
  freeOnly: boolean,
) {
  try {
    const query = mimeType.startsWith("image/") ? "?input_modalities=image" : "";
    const response = await fetch(`https://openrouter.ai/api/v1/models${query}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`model discovery returned ${response.status}`);
    const result = await response.json();
    const models = (Array.isArray(result?.data) ? result.data : [])
      .filter((model: any) => {
        const free =
          Number(model?.pricing?.prompt || 0) === 0 &&
          Number(model?.pricing?.completion || 0) === 0;
        const modalities = Array.isArray(model?.architecture?.input_modalities)
          ? model.architecture.input_modalities
          : String(model?.architecture?.modality || "").split("->");
        return (
          model?.id &&
          (!mimeType.startsWith("image/") ||
            modalities.some((item: string) => item.toLowerCase().includes("image"))) &&
          (!freeOnly || free)
        );
      })
      .map((model: any) => {
        const parameters = Array.isArray(model.supported_parameters)
          ? model.supported_parameters
          : [];
        const structured = parameters.some((item: string) =>
          ["response_format", "structured_outputs"].includes(item),
        );
        return {
          id: String(model.id),
          structured,
          score:
            (model.id === preferred ? 1_000_000_000 : 0) +
            (structured ? 100_000_000 : 0) +
            (/google\/(gemini|gemma)/i.test(model.id) ? 10_000_000 : 0) +
            Number(model.context_length || 0),
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 4)
      .map(({ id, structured }: any) => ({ id, structured }));
    return models.length ? models : [{ id: "openrouter/free", structured: false }];
  } catch {
    return [{ id: "openrouter/free", structured: false }];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer "))
      return respond({ error: "Unauthorized: sign in to Azarraga first" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !auth.user)
      return respond({ error: "Unauthorized: invalid or expired session" }, 401);
    const key = Deno.env.get("OPENROUTER_API_KEY");
    if (!key)
      return respond(
        { error: "OPENROUTER_API_KEY is missing from Supabase Edge Function secrets" },
        503,
      );
    const body = await req.json();
    if (!body.fileName || !body.mimeType || !body.dataUrl)
      return respond({ error: "Filename, MIME type and document content are required" }, 400);
    if (!String(body.mimeType).startsWith("image/") && body.mimeType !== "application/pdf")
      return respond({ error: "Only image and PDF documents are supported" }, 415);
    const media = String(body.mimeType).startsWith("image/")
      ? { type: "image_url", image_url: { url: body.dataUrl } }
      : { type: "file", file: { filename: body.fileName, file_data: body.dataUrl } };
    const { data: settings } = await supabase
      .from("agent_settings")
      .select("model,free_models_only")
      .eq("id", 1)
      .maybeSingle();
    const models = await extractionModels(
      key,
      String(body.mimeType),
      settings?.model || null,
      settings?.free_models_only !== false,
    );
    const failures: string[] = [];
    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
            "X-Title": "TALA Commercial Document Review",
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              {
                role: "system",
                content: model.structured
                  ? `${rules}\nReturn exactly one valid JSON object. Never include safety labels, analysis, markdown or prose.`
                  : rules,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Read ${body.fileName}. Extract every visible field, account, price, dimension, line item and scope item. ${body.expectedType ? `This came from the ${body.expectedType} intake, but preserve its actual document semantics.` : ""}`,
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
            ...(body.mimeType === "application/pdf"
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
        const content = messageText(result?.choices?.[0]?.message?.content);
        if (!content) throw new Error("TALA returned no extraction content");
        const extracted = parseExtractionText(content);
        extracted.extractionModel = model.id;
        return respond(extracted);
      } catch (error) {
        failures.push(`${model.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return respond(
      {
        error: `Every compatible extraction model failed: ${failures.join(" | ").slice(0, 1200)}`,
      },
      422,
    );
  } catch (error) {
    console.error("[TALA document extract]", error);
    return respond(
      { error: error instanceof Error ? error.message : "Unexpected document extraction failure" },
      500,
    );
  }
});
