// Server middleware for authenticated Supabase-backed server functions.
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_')
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value))
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) headers.delete('Authorization')
    headers.set('apikey', supabaseKey)
    return fetch(input, { ...init, headers })
  }
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const { supabase } = await import('./client')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Unauthorized: sign in to Azarraga first')
    return next({ headers: { Authorization: `Bearer ${session.access_token}` } })
  })
  .server(async ({ next }) => {
    const SUPABASE_URL = process.env['SUPABASE_URL']
    const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY']
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Missing Supabase server environment. Connect Supabase in Lovable Cloud.')
    const request = getRequest()
    const authHeader = request?.headers?.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized: no Supabase session')
    const token = authHeader.slice(7)
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY), headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getClaims(token)
    if (error || !data?.claims?.sub) throw new Error('Unauthorized: invalid Supabase session')
    return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } })
  })
