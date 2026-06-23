import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Fail loudly instead of silently creating a powerless client.
  // Without the service-role key, RLS blocks admin deletes with NO error,
  // which makes "delete user" appear to do nothing.
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client is misconfigured: SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is missing on the server. Set it in your hosting environment variables.'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
