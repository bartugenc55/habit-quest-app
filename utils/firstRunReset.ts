import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { SUPABASE_AUTH_KEY } from './supabase'

const FIRST_RUN_KEY = 'hq_first_run_done_v1'

/**
 * All SecureStore/Keychain keys that Supabase auth may have written.
 * Includes chunked variants (.0/.1/.2) written when the token value
 * exceeds AsyncStorage's 2 KB per-key limit, plus legacy v1 key names.
 */
export function getSupabaseSecureStoreKeys(): string[] {
  return [
    // Primary key — exactly what createClient uses (storageKey)
    SUPABASE_AUTH_KEY,
    `${SUPABASE_AUTH_KEY}-code-verifier`,
    // Chunked variants written by supabase-js for large tokens
    `${SUPABASE_AUTH_KEY}.0`,
    `${SUPABASE_AUTH_KEY}.1`,
    `${SUPABASE_AUTH_KEY}.2`,
    // Legacy supabase-js v1 / generic key names
    'supabase.auth.token',
    'supabase.auth.refreshToken',
    'supabase.auth.expiresAt',
  ]
}

/** Delete all known Supabase SecureStore / Keychain entries. Safe to call repeatedly. */
export async function clearSupabaseSecureStoreKeys(): Promise<void> {
  const keys = getSupabaseSecureStoreKeys()
  for (const key of keys) {
    try {
      console.log('[Boot] deleting key:', key)
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Key may not exist — ignore
    }
  }
}

/**
 * If this is a fresh install (no FIRST_RUN_KEY in AsyncStorage),
 * clear any Keychain/SecureStore tokens left over from a previous install.
 * Must be called BEFORE Supabase client is initialised (getSupabase()).
 */
export async function resetAuthOnFreshInstallIfNeeded(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(FIRST_RUN_KEY)
    if (done) {
      console.log('[Boot] freshInstall=false')
      return
    }

    console.log('[Boot] freshInstall=true')
    console.log('[Boot] keychainCleanup START')

    // 1. Delete every known SecureStore/Keychain key
    await clearSupabaseSecureStoreKeys()

    // 2. Delete matching AsyncStorage keys (sb-* and supabase*)
    const allKeys = await AsyncStorage.getAllKeys()
    const staleKeys = allKeys.filter(
      (k) => k.startsWith('sb-') || k.startsWith('supabase'),
    )
    for (const k of staleKeys) {
      console.log('[Boot] deleting AsyncStorage key:', k)
    }
    if (staleKeys.length > 0) {
      await AsyncStorage.multiRemove(staleKeys)
    }

    console.log('[Boot] keychainCleanup END')
    await AsyncStorage.setItem(FIRST_RUN_KEY, '1')
  } catch (e) {
    console.error('[Boot] resetAuthOnFreshInstallIfNeeded error:', e)
    // Even if cleanup fails, mark as done to avoid repeated attempts
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, '1')
    } catch {}
  }
}
