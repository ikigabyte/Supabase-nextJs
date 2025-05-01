// utils/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Returns a Supabase client scoped to the current logged-in user (reads JWT from cookies)
 */
export function createClientComponent(): SupabaseClient {
  if (!supabase) {
    
    supabase = createClientComponentClient()
    console.log("supabase", supabase)
  }
  return supabase
}