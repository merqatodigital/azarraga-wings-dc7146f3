import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";

const zero = (v: unknown) => Number(v ?? 1) === 0;

/**
 * Lists OpenRouter models. The API key never leaves the server.
 */
export const listAgentModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const res = await fetch(OPENROUTER_MODELS, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`OpenRouter models returned ${res.status}`);
      const json = (await res.json()) as { data?: Array<Record<string, any>> };
      const all = (json.data ?? []).map((m) => ({
        id: String(m.id),
        name: String(m.name ?? m.id),
        contextLength: (m.context_length as number) ?? null,
        free: zero(m?.pricing?.prompt) && zero(m?.pricing?.completion),
      }));
      all.sort((a, b) => Number(b.free) - Number(a.free) || (b.contextLength ?? 0) - (a.contextLength ?? 0));
      return { provider: "openrouter" as const, models: all, error: null as string | null };
    } catch {
      return { provider: "openrouter" as const, models: [], error: "Unable to load OpenRouter models right now." };
    }
  });

const AskInput = z.object({
  message: z.string().min(1),
  model: z.string().min(1),
  intent: z.enum(["leads", "quotes", "invoices", "icm", "documents", "general"]).default("general"),
});

const SYSTEM_RULES = `You are the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.
Your jobs are FIND BUSINESS (lead qualification), WIN BUSINESS (document extraction, takeoff and quotation drafting), and BILL BUSINESS (draft invoice preparation).
Use commercial memory as evidence, never as permission to invent a current price.
Never infer VAT/tax treatment. Never issue or send a quote or invoice.
The deterministic engine performs ALL final arithmetic and a human approves every commercial document.
Never fabricate historical records, prices, customers or documents. If a value is not in the provided evidence, say it is missing.
Clearly separate FACT, DERIVED VALUE, AGENT INFERENCE and HUMAN-APPROVED VALUE.
State assumptions, missing information, confidence and source evidence (document reference + date) for every claim.
Base currency is PHP (Philippine peso).`;

/**
 * Runs the commercial agent against real Lovable Cloud data.
 * Context is read with the caller's own permissions (RLS applies).
 */
export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["OPENROUTER_API_KEY"];
    if (!key) return { error: "OpenRouter is not configured.", reply: "", model: data.model };

    const { supabase } = context;
    const [evidence, quotes, invoices, leads, docs, customers] = await Promise.all([
      supabase
        .from("commercial_evidence")
        .select(
          "product_family, system, customer_name, project_name, location, width_mm, height_mm, quantity, historical_unit_price_centavos, currency, source_reference, source_date, pricing_type",
        )
        .order("source_date", { ascending: false })
        .limit(60),
      supabase
        .from("quotes")
        .select("quote_number, customer_name, project_name, status, total_centavos, warnings, quote_date")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("invoices")
        .select("invoice_number, customer_name, project_name, status, total_centavos, balance_centavos, invoice_type")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("leads").select("project, location, project_type, status, score, next_action").order("created_at", { ascending: false }).limit(20),
      supabase
        .from("source_documents")
        .select("doc_type, reference, customer_name, project_name, ingestion_status, doc_date, extracted")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("customers").select("name, company, project_address").order("created_at", { ascending: false }).limit(30),
    ]);

    const icmContext = JSON.stringify({
      note: "All amounts are integer centavos in PHP. Historical unit prices are EVIDENCE ONLY.",
      commercialMemory: evidence.data ?? [],
      quotes: quotes.data ?? [],
      invoices: invoices.data ?? [],
      leads: leads.data ?? [],
      sourceDocuments: docs.data ?? [],
      customers: customers.data ?? [],
    });

    const system = `${SYSTEM_RULES}\nCurrent intent: ${data.intent}.\nICM CONTEXT (live database):\n${icmContext}`;

    try {
      const res = await fetch(OPENROUTER_CHAT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "Azarraga Commercial Agent",
        },
        body: JSON.stringify({
          model: data.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.message },
          ],
          temperature: 0.2,
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) return { error: json?.error?.message ?? `OpenRouter returned ${res.status}`, reply: "", model: data.model };
      return {
        error: null as string | null,
        reply: String(json?.choices?.[0]?.message?.content ?? ""),
        model: data.model,
        humanReviewRequired: true,
      };
    } catch {
      return { error: "Agent request failed.", reply: "", model: data.model };
    }
  });
