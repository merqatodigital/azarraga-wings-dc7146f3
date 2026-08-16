// Supabase client for the Azarraga commercial workspace.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) headers.delete('Authorization');
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [...(!SUPABASE_URL ? ['SUPABASE_URL'] : []), ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : [])];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`);
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
    auth: { storage: typeof window !== 'undefined' ? localStorage : undefined, persistSession: true, autoRefreshToken: true },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;
const BUILD_MODE = true;
const BUILD_SESSION = { access_token: 'azarraga-build-mode', token_type: 'bearer', expires_in: 31536000, expires_at: 4102444800, refresh_token: '', user: { id: 'azarraga-build-mode', aud: 'authenticated', role: 'authenticated', email: 'build@azarraga.local', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() } } as any;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    // While we are actively building the client presentation, never trap the
    // workspace behind an auth screen. Real Supabase auth can be re-enabled
    // after the owner explicitly asks for access control.
    if (BUILD_MODE && prop === 'auth') {
      const realAuth = _supabase.auth;
      return new Proxy(realAuth, {
        get(target, authProp, authReceiver) {
          if (authProp === 'getSession') return async () => ({ data: { session: BUILD_SESSION }, error: null });
          if (authProp === 'onAuthStateChange') return (_callback: any) => ({ data: { subscription: { unsubscribe() {} } } });
          if (authProp === 'signOut') return async () => ({ error: null });
          return Reflect.get(target, authProp, authReceiver);
        },
      });
    }
    return Reflect.get(_supabase, prop, receiver);
  },
});
