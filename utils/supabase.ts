import { createClient, SupabaseClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

export const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? ''
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? ''

/**
 * Single explicit storage key for Supabase auth.
 * Passed to createClient AND used by firstRunReset.ts cleanup —
 * both sides must reference this same constant so cleanup deletes
 * exactly the key the client reads.
 */
export const SUPABASE_AUTH_KEY = `sb-${(() => {
  try { return new URL(supabaseUrl).hostname.split('.')[0] } catch { return 'unknown' }
})()}-auth-token`

let _instance: SupabaseClient | null = null

/**
 * Lazy-initialized Supabase client.
 * Created on first call so that fresh-install keychain cleanup
 * can run BEFORE any persisted session is read.
 */
export function getSupabase(): SupabaseClient {
  if (!_instance) {
    console.log('[Supabase] client created', new Error().stack)
    _instance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        storageKey: SUPABASE_AUTH_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return _instance
}
