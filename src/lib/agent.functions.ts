import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const FREE_ROUTER = {
  id: "openrouter/free",
  name: "OpenRouter Free Router",
  contextLength: null as number | null,
  free: true,
};
const zero = (v: unknown) => Number(v ?? 1) === 0;
function runtimeSecret(name: string) {
  const p = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (p) return p;
  const m = (import.meta as any)?.env?.[name];
  if (m) return m;
  return (globalThis as any)?.env?.[name] as string | undefined;
}

export const listAgentModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = runtimeSecret("OPENROUTER_API_KEY");
    try {
      const res = await fetch(OPENROUTER_MODELS, {
        headers: { Accept: "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      });
      if (!res.ok) throw new Error(`OpenRouter models returned ${res.status}`);
      const json = (await res.json()) as { data?: Array<Record<string, any>> };
      const discovered = (json.data ?? [])
        .map((m) => ({
          id: String(m.id),
          name: String(m.name ?? m.id),
          contextLength: (m.context_length as number) ?? null,
          free: zero(m?.pricing?.prompt) && zero(m?.pricing?.completion),
        }))
        .filter((m) => m.free);
      const models = [FREE_ROUTER, ...discovered.filter((m) => m.id !== FREE_ROUTER.id)];
      models.sort((a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0));
      return {
        provider: "openrouter" as const,
        models,
        error: key ? null : "OpenRouter secret is not visible to this runtime.",
      };
    } catch (error) {
      console.error("[Azarraga Agent] model discovery failed", error);
      return {
        provider: "openrouter" as const,
        models: [FREE_ROUTER],
        error: key ? null : "OpenRouter secret is not visible to this runtime.",
      };
    }
  });

const AskInput = z.object({
  message: z.string().min(1),
  model: z.string().min(1),
  intent: z.enum(["leads", "quotes", "invoices", "icm", "documents", "general"]).default("general"),
});
const SYSTEM_RULES = `You are TALA, the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.
Your jobs are FIND BUSINESS, WIN BUSINESS, UNDERSTAND THE CUSTOMER, UNDERSTAND THE JOB, and BILL BUSINESS.
COMMERCIAL MEMORY RULES:
1. Read source_documents as provenance. A document's doc_type controls what it means. A client PURCHASE ORDER is an order received by Azarraga; it is NOT an Azarraga invoice and must never be called one.
2. Learn customer identity from customers and contacts. If a field is absent, say it is not recorded. Never invent a contact person or telephone number.
3. Preserve opening codes such as SD4, SD5 and D5, system names, configuration, glass thickness/type, frame color, dimensions, quantities and included services.
4. Historical prices are evidence only. State the source PO and date when discussing them.
5. Distinguish product price from crating, shipping, trucking, delivery, installation and discounts.
6. Amounts ending _centavos are integer centavos. Convert to PHP pesos for people.
7. Never infer VAT/tax treatment from a displayed VAT amount. A human approves commercial documents.
8. Never fabricate historical records, prices, customers, dimensions or documents. Flag ambiguity for human confirmation.
9. When asked what we sold a customer, answer from dated PO/product history.
10. Clearly separate FACT, DERIVED VALUE, AGENT INFERENCE and HUMAN-APPROVED VALUE. Base currency is PHP.`;

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = runtimeSecret("OPENROUTER_API_KEY");
    if (!key)
      return {
        error: "OpenRouter secret is not visible to the deployed app runtime.",
        reply: "",
        model: data.model,
      };
    const { supabase } = context;
    const [
      evidence,
      quotes,
      invoices,
      leads,
      docs,
      customers,
      contacts,
      projects,
      purchaseOrders,
      itemsPurchased,
    ] = await Promise.all([
      supabase
        .from("commercial_evidence")
        .select(
          "product_family, system, configuration, glass, frame_color, customer_name, project_name, location, width_mm, height_mm, quantity, historical_unit_price_centavos, historical_line_amount_centavos, currency, included_services, source_reference, source_date, pricing_type, raw",
        )
        .order("source_date", { ascending: false })
        .limit(100),
      supabase
        .from("quotes")
        .select(
          "quote_number, customer_name, project_name, status, total_centavos, warnings, quote_date",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("invoices")
        .select(
          "invoice_number, customer_name, project_name, status, total_centavos, balance_centavos, invoice_type, po_reference",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("leads")
        .select("project, location, project_type, status, score, next_action")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("source_documents")
        .select(
          "doc_type, reference, customer_name, project_name, location, ingestion_status, doc_date, extracted, missing_information, conflicts, human_review_required, notes",
        )
        .order("doc_date", { ascending: false })
        .limit(40),
      supabase
        .from("customers")
        .select("id, name, company, billing_address, project_address, tin, phone, email, notes")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("contacts")
        .select("customer_id, name, role, phone, email, notes")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("projects")
        .select("id, customer_id, name, location, status, notes")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("purchase_orders")
        .select(
          "id, po_number, customer_id, project_id, po_date, total_centavos, currency, terms, status, comparison, source_document_id",
        )
        .order("po_date", { ascending: false })
        .limit(50),
      supabase
        .from("items_purchased")
        .select(
          "customer_id, project_id, purchase_order_id, product_family, system, description, glass, frame_color, width_mm, height_mm, quantity, unit_price_centavos, currency, purchased_on, source_reference",
        )
        .order("purchased_on", { ascending: false })
        .limit(150),
    ]);
    const dbError = [
      evidence,
      quotes,
      invoices,
      leads,
      docs,
      customers,
      contacts,
      projects,
      purchaseOrders,
      itemsPurchased,
    ].find((r: any) => r.error)?.error;
    if (dbError)
      return {
        error: `Commercial memory query failed: ${dbError.message}`,
        reply: "",
        model: data.model,
      };
    const contextJson = JSON.stringify({
      note: "Amounts are integer centavos in PHP. Historical prices are evidence only. Source document type is authoritative for document meaning.",
      commercialMemory: evidence.data ?? [],
      quotes: quotes.data ?? [],
      invoices: invoices.data ?? [],
      leads: leads.data ?? [],
      sourceDocuments: docs.data ?? [],
      customers: customers.data ?? [],
      contacts: contacts.data ?? [],
      projects: projects.data ?? [],
      purchaseOrders: purchaseOrders.data ?? [],
      itemsPurchased: itemsPurchased.data ?? [],
    });
    try {
      const res = await fetch(OPENROUTER_CHAT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://azarraga.vercel.app",
          "X-Title": "Azarraga Commercial Agent",
        },
        body: JSON.stringify({
          model: data.model || "openrouter/free",
          messages: [
            {
              role: "system",
              content: `${SYSTEM_RULES}\nCurrent intent: ${data.intent}.\nLIVE COMMERCIAL CONTEXT:\n${contextJson}`,
            },
            { role: "user", content: data.message },
          ],
          temperature: 0.2,
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok)
        return {
          error: json?.error?.message ?? `OpenRouter returned ${res.status}`,
          reply: "",
          model: data.model,
        };
      return {
        error: null as string | null,
        reply: String(json?.choices?.[0]?.message?.content ?? ""),
        model: data.model,
        humanReviewRequired: true,
      };
    } catch (error) {
      console.error("[Azarraga Agent] request failed", error);
      return { error: "Agent request failed.", reply: "", model: data.model };
    }
  });

export async function extractCommercialDocument({
  data,
}: {
  data: { fileName: string; mimeType: string; dataUrl: string };
}) {
  const { data: result, error } = await supabase.functions.invoke("tala-document-extract", {
    body: data,
  });
  if (error) throw new Error(`TALA document runtime: ${error.message}`);
  if (result?.error) throw new Error(String(result.error));
  return result;
}
