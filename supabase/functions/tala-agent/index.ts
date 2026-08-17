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
const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const freeRouter = {
  id: "openrouter/free",
  name: "OpenRouter Free Router",
  contextLength: null,
  free: true,
  inputPricePerMillion: 0,
  outputPricePerMillion: 0,
};
const price = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const rules = `You are TALA, the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.
Use only the live commercial context provided. Never invent a customer, contact, document, item, dimension, price or source.
A customer's purchase order is an order received by Azarraga, never an Azarraga invoice.
Preserve raw descriptions, opening codes, systems, glass, frames, dimensions, quantities and services.
Historical prices are evidence only. Identify the exact source reference and date for every historical price.
Keep product prices separate from VAT, crating, shipping, trucking, delivery, installation and discounts.
Amounts ending in _centavos are integer PHP centavos. If information is absent, explicitly say it is absent.`;

async function authenticatedClient(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("Unauthorized: sign in required");
  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new Error("Unauthorized: invalid or expired session");
  return client;
}

async function discoverModels(key: string) {
  const response = await fetch(OPENROUTER_MODELS, {
    headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result?.error?.message || `OpenRouter models returned ${response.status}`);
  const models = (result?.data || [])
    .filter((model: any) => model?.id)
    .map((model: any) => {
      const prompt = price(model?.pricing?.prompt);
      const completion = price(model?.pricing?.completion);
      return {
        id: String(model.id),
        name: String(model.name || model.id),
        contextLength: Number.isFinite(Number(model.context_length))
          ? Number(model.context_length)
          : null,
        free: prompt === 0 && completion === 0,
        inputPricePerMillion: prompt * 1_000_000,
        outputPricePerMillion: completion * 1_000_000,
      };
    });
  return [freeRouter, ...models.filter((model: any) => model.id !== freeRouter.id)].sort(
    (a: any, b: any) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      if (a.id === freeRouter.id) return -1;
      if (b.id === freeRouter.id) return 1;
      return (b.contextLength || 0) - (a.contextLength || 0) || a.name.localeCompare(b.name);
    },
  );
}

async function commercialContext(supabase: any) {
  const queries = await Promise.all([
    supabase
      .from("commercial_evidence")
      .select("*")
      .order("source_date", { ascending: false })
      .limit(100),
    supabase
      .from("quotes")
      .select("quote_number,customer_name,project_name,status,total_centavos,warnings,quote_date")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("invoices")
      .select(
        "invoice_number,customer_name,project_name,status,total_centavos,balance_centavos,invoice_type,po_reference",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("leads")
      .select("project,location,project_type,status,score,next_action")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("source_documents")
      .select(
        "doc_type,reference,customer_name,project_name,location,ingestion_status,doc_date,extracted,missing_information,conflicts,human_review_required,notes",
      )
      .order("doc_date", { ascending: false })
      .limit(40),
    supabase
      .from("customers")
      .select("id,name,company,billing_address,project_address,tin,phone,email,notes")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("contacts")
      .select("customer_id,name,role,phone,email,notes")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("id,customer_id,name,location,status,notes")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("purchase_orders")
      .select(
        "id,po_number,customer_id,project_id,po_date,total_centavos,currency,terms,status,comparison,source_document_id",
      )
      .order("po_date", { ascending: false })
      .limit(50),
    supabase
      .from("items_purchased")
      .select(
        "customer_id,project_id,purchase_order_id,product_family,system,description,glass,frame_color,width_mm,height_mm,quantity,unit_price_centavos,currency,purchased_on,source_reference",
      )
      .order("purchased_on", { ascending: false })
      .limit(150),
  ]);
  const error = queries.find((query: any) => query.error)?.error;
  if (error) throw new Error(`Commercial memory query failed: ${error.message}`);
  const [
    evidence,
    quotes,
    invoices,
    leads,
    documents,
    customers,
    contacts,
    projects,
    purchaseOrders,
    itemsPurchased,
  ] = queries;
  return {
    note: "Amounts are integer PHP centavos. Source document type is authoritative.",
    commercialMemory: evidence.data || [],
    quotes: quotes.data || [],
    invoices: invoices.data || [],
    leads: leads.data || [],
    sourceDocuments: documents.data || [],
    customers: customers.data || [],
    contacts: contacts.data || [],
    projects: projects.data || [],
    purchaseOrders: purchaseOrders.data || [],
    itemsPurchased: itemsPurchased.data || [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const supabase = await authenticatedClient(req);
    const key = Deno.env.get("OPENROUTER_API_KEY");
    if (!key) return respond({ error: "OPENROUTER_API_KEY is missing from Supabase secrets" }, 503);
    const body = await req.json();
    if (body.action === "models") {
      const models = await discoverModels(key);
      return respond({ provider: "openrouter", models, secretConfigured: true, error: null });
    }
    if (body.action !== "chat") return respond({ error: "Unknown TALA action" }, 400);
    const message = String(body.message || "").trim();
    const model = String(body.model || "openrouter/free");
    const intent = String(body.intent || "general");
    if (!message) return respond({ error: "Question is required" }, 400);
    const context = await commercialContext(supabase);
    const response = await fetch(OPENROUTER_CHAT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
        "X-Title": "Azarraga Commercial Agent",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${rules}\nCurrent intent: ${intent}.\nLIVE COMMERCIAL CONTEXT:\n${JSON.stringify(context)}`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return respond(
        { error: result?.error?.message || `OpenRouter returned ${response.status}` },
        502,
      );
    const reply = String(result?.choices?.[0]?.message?.content || "");
    if (!reply) return respond({ error: "TALA returned no response" }, 502);
    return respond({ error: null, reply, model, humanReviewRequired: true });
  } catch (error) {
    console.error("[TALA agent]", error);
    const message = error instanceof Error ? error.message : "Unexpected TALA failure";
    return respond({ error: message }, message.startsWith("Unauthorized") ? 401 : 500);
  }
});
