import { supabase } from '@/integrations/supabase/client'
import { listAgentModels, askAgent } from '@/lib/agent.functions'

export type WorkflowHealthCheck = {
  name: string
  ok: boolean
  detail: string
}

/**
 * Runtime acceptance checks for the live Azarraga commercial workspace.
 * These checks intentionally use the authenticated Supabase session and real
 * application endpoints. They do not fabricate commercial records.
 */
export async function runWorkflowHealthChecks(): Promise<WorkflowHealthCheck[]> {
  const checks: WorkflowHealthCheck[] = []
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })

  const { data: auth, error: authError } = await supabase.auth.getUser()
  push('Authentication', Boolean(auth.user) && !authError, authError?.message || (auth.user ? `Authenticated as ${auth.user.email || auth.user.id}` : 'No authenticated user'))
  if (!auth.user) return checks

  const tables = [
    'customers', 'contacts', 'leads', 'projects', 'quotes', 'quote_lines',
    'purchase_orders', 'purchase_order_lines', 'invoices', 'invoice_lines',
    'payments', 'client_documents', 'source_documents', 'items_purchased',
    'commercial_evidence', 'agent_settings', 'exchange_rates',
  ] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1)
    push(`Database: ${table}`, !error, error?.message || 'Readable through RLS')
  }

  const { data: storageData, error: storageError } = await supabase.storage.from('commercial-documents').list(auth.user.id, { limit: 1 })
  push('Storage: commercial-documents', !storageError, storageError?.message || `Accessible (${storageData?.length || 0} sampled file${storageData?.length === 1 ? '' : 's'})`)

  try {
    const models: any = await listAgentModels()
    const modelList = models?.models || []
    push('Agent: OpenRouter model discovery', modelList.length > 0 && !models?.error, models?.error || `${modelList.length} model(s) available`)

    const model = modelList[0]?.id || 'openrouter/free'
    const reply: any = await askAgent({ data: { message: 'Health check only. Reply exactly: TALA_OK', model, intent: 'general' } })
    push('Agent: live response', !reply?.error && Boolean(reply?.reply), reply?.error || reply?.reply || 'No response')
  } catch (error: any) {
    push('Agent: live response', false, error?.message || String(error))
  }

  const { data: learned, error: learnedError } = await supabase
    .from('source_documents')
    .select('id,doc_type,reference,ingestion_status,human_review_required')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  push('Documents: learned extraction', !learnedError && Boolean(learned), learnedError?.message || (learned ? `${learned.doc_type} ${learned.reference || ''} · ${learned.ingestion_status}`.trim() : 'No learned source document exists yet'))

  if (learned) {
    const { count, error } = await supabase.from('commercial_evidence').select('*', { head: true, count: 'exact' }).eq('source_document_id', learned.id)
    push('Documents: commercial memory evidence', !error && Number(count || 0) > 0, error?.message || `${count || 0} evidence row(s) linked to latest learned document`)
  }

  return checks
}

export function workflowHealthPassed(checks: WorkflowHealthCheck[]) {
  return checks.length > 0 && checks.every((check) => check.ok)
}
