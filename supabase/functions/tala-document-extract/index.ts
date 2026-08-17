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
const rules = `Extract every legible field and every line item from this Azarraga Glass & Aluminum commercial document. Do not summarize or invent. Return JSON only:
{"docType":"purchase_order|invoice|quotation|receipt|supplier_quote|unknown","reference":null,"docDate":null,"expectedDate":null,"mrsNumber":null,"prNumber":null,"prsNumber":null,"paymentTerms":null,"paymentMilestones":[{"percent":null,"trigger":null,"rawText":""}],"deliverySchedule":null,"contractType":null,"warranty":null,"serviceScope":null,"memo":null,"transactionId":null,"supplier":{"name":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"buyer":{"name":null,"businessStyle":null,"address":null,"tin":null,"contactPerson":null,"email":null,"phone":null},"project":{"name":null,"location":null},"instructions":null,"lines":[{"lineNo":1,"openingCode":null,"quantity":1,"unit":"SET","rawDescription":"","productFamily":null,"system":null,"configuration":null,"glassThicknessMm":null,"glassType":null,"glassColor":null,"frameColor":null,"widthMm":null,"heightMm":null,"rawDimensions":null,"hardware":[],"class":null,"unitPriceCentavos":null,"vatCentavos":null,"amountCentavos":null,"confidence":1,"humanReviewRequired":false}],"adjustments":[{"type":"CRATING|SHIPPING|TRUCKING|DELIVERY|INSTALLATION|DISCOUNT|OTHER","description":"","amountCentavos":0,"rawText":""}],"financialSummary":{"subtotalCentavos":null,"amountWithoutTaxCentavos":null,"vatCentavos":null,"totalCentavos":null},"totalCentavos":null,"missingInformation":[],"conflicts":[]}.
Amounts are integer centavos. Preserve exact raw descriptions, scope, instructions and raw dimensions. Normalize dimensions to millimeters only when clearly stated. Preserve opening codes. Separate VAT, crating, shipping, trucking, delivery, installation and discounts from product lines. The document issuer/buyer is the customer account; the party named TO/vendor/supplier is the supplier. A customer's PO addressed to Azarraga is purchase_order, never an Azarraga invoice. Capture business style, TIN, email and phone only when printed. Store PR, PRS and MRS in their matching fields. Preserve payment milestones, delivery schedule, contract type and warranty verbatim. Do not add VAT twice: financialSummary must reflect the printed subtotal/amount without tax/VAT/total, while line amounts remain exactly as printed. If printed line totals and tax presentation are ambiguous, preserve both and add a conflict instead of changing the figures. Unreadable fields are null and listed in missingInformation. Ambiguity requires humanReviewRequired=true.`;

function parse(text: string) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  const value = JSON.parse(clean);
  if (!value || typeof value !== "object" || !Array.isArray(value.lines))
    throw new Error("missing line-item array");
  value.lines = value.lines.map((line: any, index: number) => ({
    ...line,
    lineNo: Number(line.lineNo) || index + 1,
    quantity: Number(line.quantity),
    unit: String(line.unit || ""),
    rawDescription: String(line.rawDescription || ""),
    hardware: Array.isArray(line.hardware) ? line.hardware : [],
    confidence: Number.isFinite(Number(line.confidence)) ? Number(line.confidence) : 0,
    humanReviewRequired: Boolean(
      line.humanReviewRequired || !line.rawDescription || !Number.isFinite(Number(line.quantity)),
    ),
  }));
  value.adjustments = Array.isArray(value.adjustments) ? value.adjustments : [];
  value.paymentMilestones = Array.isArray(value.paymentMilestones) ? value.paymentMilestones : [];
  value.missingInformation = Array.isArray(value.missingInformation)
    ? value.missingInformation
    : [];
  value.conflicts = Array.isArray(value.conflicts) ? value.conflicts : [];
  return value;
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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
        "X-Title": "TALA PO Document Review",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: rules },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read ${body.fileName}. Return every visible PO field, price, dimension and scope item.`,
              },
              media,
            ],
          },
        ],
        temperature: 0,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return respond(
        { error: result?.error?.message || `OpenRouter returned ${response.status}` },
        502,
      );
    const content = String(result?.choices?.[0]?.message?.content || "");
    if (!content) return respond({ error: "TALA returned no extraction content" }, 502);
    try {
      return respond(parse(content));
    } catch (error) {
      return respond(
        {
          error: `TALA returned invalid extraction JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
        422,
      );
    }
  } catch (error) {
    console.error("[TALA document extract]", error);
    return respond(
      { error: error instanceof Error ? error.message : "Unexpected document extraction failure" },
      500,
    );
  }
});
