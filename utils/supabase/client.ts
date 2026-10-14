import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { recordRealtimeDiagnostic } from './realtime-diagnostics'

let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          worker: true,
          logger: (kind: string, message: string, data: unknown) => {
            // This SDK can pass an undefined message for native WebSocket errors.
            if (typeof message !== 'string') {
              if (kind === 'transport') recordRealtimeDiagnostic('transport', 'error')
              return
            }
            if (kind === 'push' && message.startsWith('phoenix heartbeat ')) {
              recordRealtimeDiagnostic('heartbeat', 'sent')
            } else if (kind === 'receive' && message.includes('phoenix phx_reply ')) {
              recordRealtimeDiagnostic('heartbeat', message.startsWith('ok ') ? 'ok' : 'error')
            } else if (kind === 'transport' && message.startsWith('heartbeat timeout')) {
              recordRealtimeDiagnostic('heartbeat', 'timeout')
            } else if (kind === 'transport' && message.startsWith('connected to')) {
              recordRealtimeDiagnostic('transport', 'OPEN')
            } else if (kind === 'transport' || (kind === 'worker' && message === 'worker error')) {
              const event = data as CloseEvent | undefined
              recordRealtimeDiagnostic(kind, message === 'close' ? 'close' : kind === 'worker' ? 'worker error' : 'error', {
                code: event?.code,
                reason: event?.reason,
                wasClean: event?.wasClean,
              })
            }
          },
        },
      }
    )
    supabase.auth.onAuthStateChange((event) => {
      recordRealtimeDiagnostic('auth', event)
    })
  }
  return supabase 
}
