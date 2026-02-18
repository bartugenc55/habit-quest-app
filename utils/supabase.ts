import { createClient, SupabaseClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

export const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? ''
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? ''

let _instance: SupabaseClient | null = null

/**
 * Lazy-initialized Supabase client.
 * Created on first call so that fresh-install keychain cleanup
 * can run BEFORE any persisted session is read.
 */
export function getSupabase(): SupabaseClient {
  if (!_instance) {
    console.log('[Supabase] client created')
    _instance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return _instance
}
