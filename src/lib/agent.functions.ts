import { supabase } from "@/integrations/supabase/client";
import type { TalaIntent } from "@/lib/agent-quick-actions";

async function invokeTala(body: Record<string, unknown>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("Sign in to use TALA");
  const { data, error } = await supabase.functions.invoke("tala-agent", { body });
  if (error) throw new Error(`TALA runtime: ${error.message}`);
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function listAgentModels() {
  return invokeTala({ action: "models" });
}

export async function askAgent({
  data,
}: {
  data: { message: string; model: string; intent: TalaIntent };
}) {
  return invokeTala({ action: "chat", ...data });
}

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
