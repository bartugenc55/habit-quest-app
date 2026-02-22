import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { KEYCHAIN_SERVICE, STORAGE_KEY } from './authConstants'

export { KEYCHAIN_SERVICE, STORAGE_KEY } from './authConstants'

export const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? ''
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? ''

/**
 * Logging + SecureStore adapter.
 *
 * Every read / write / delete is printed to the Xcode console so we can
 * see exactly what key the Supabase client is accessing and what it finds.
 * All writes go to { keychainService: KEYCHAIN_SERVICE } so cleanup can
 * target the exact same keychain entries.
 */
const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    console.log(`[SecureStore] getItem: "${key}"`)
    try {
      const value = await SecureStore.getItemAsync(key, { keychainService: KEYCHAIN_SERVICE })
      if (value !== null) {
        console.log(`[SecureStore] getItem: "${key}" → HAS_VALUE (${value.length} bytes)`)
      } else {
        console.log(`[SecureStore] getItem: "${key}" → null`)
      }
      return value
    } catch (e) {
      console.log(`[SecureStore] getItem: "${key}" → ERROR`, e)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    console.log(`[SecureStore] setItem: "${key}" (${value.length} bytes)`)
    try {
      await SecureStore.setItemAsync(key, value, { keychainService: KEYCHAIN_SERVICE })
      console.log(`[SecureStore] setItem: "${key}" → ok`)
    } catch (e) {
      console.log(`[SecureStore] setItem: "${key}" → ERROR`, e)
      throw e
    }
  },

  async removeItem(key: string): Promise<void> {
    console.log(`[SecureStore] removeItem: "${key}"`)
    try {
      await SecureStore.deleteItemAsync(key, { keychainService: KEYCHAIN_SERVICE })
      console.log(`[SecureStore] removeItem: "${key}" → ok`)
    } catch {
      console.log(`[SecureStore] removeItem: "${key}" → ok (not found)`)
    }
  },
}

let _instance: SupabaseClient | null = null

/**
 * Lazy-initialized Supabase client.
 *
 * MUST be called only after resetAuthOnFreshInstallIfNeeded() has completed.
 * The RootLayout bootReady gate enforces this — AuthProvider (which calls
 * getSupabase()) only mounts after bootReady = true.
 */
export function getSupabase(): SupabaseClient {
  if (!_instance) {
    console.log('[Supabase] client created', new Date().toISOString())
    _instance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: secureStoreAdapter,
        storageKey: STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return _instance
}
