import { supabase } from "@/integrations/supabase/client";

export class TalaEdgeError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "TalaEdgeError";
    this.status = status;
  }
}

async function edgeError(error: any) {
  const response = error?.context instanceof Response ? error.context : null;
  let detail = error?.message || "TALA service request failed";
  if (response) {
    try {
      const payload = await response.clone().json();
      detail = payload?.error || payload?.message || detail;
    } catch {
      // Keep the SDK error when the function returned no JSON body.
    }
  }
  return new TalaEdgeError(detail, response?.status ?? null);
}

/** Invoke an authenticated, secret-bearing Supabase TALA function. */
export async function invokeTalaEdge<T>(
  functionName: "tala-agent" | "tala-document-extract",
  body: Record<string, unknown>,
): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw new TalaEdgeError(`Authentication failed: ${sessionError.message}`, 401);
  if (!session) throw new TalaEdgeError("Sign in to use TALA", 401);

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw await edgeError(error);
  if (data?.error) throw new TalaEdgeError(String(data.error));
  return data as T;
}

export function isMissingTalaEdge(error: unknown) {
  return error instanceof TalaEdgeError && error.status === 404;
}
