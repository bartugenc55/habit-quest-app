import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { supabaseUrl } from './supabase'

const FIRST_RUN_KEY = 'hq_first_run_done_v1'

/** Extract Supabase project ref from URL like https://<ref>.supabase.co */
function getProjectRef(): string | null {
  try {
    const host = new URL(supabaseUrl).hostname
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

/** SecureStore / Keychain keys that Supabase may use to persist auth tokens. */
export function getSupabaseSecureStoreKeys(): string[] {
  const ref = getProjectRef()
  return [
    // Legacy / generic supabase-js v1 keys
    'supabase.auth.token',
    'supabase.auth.refreshToken',
    // supabase-js v2 project-ref-derived keys
    ...(ref
      ? [
          `sb-${ref}-auth-token`,
          `sb-${ref}-auth-token-code-verifier`,
          `sb-${ref}-auth-token.0`,
          `sb-${ref}-auth-token.1`,
          `sb-${ref}-auth-token.2`,
        ]
      : []),
  ]
}

/** Delete all known Supabase SecureStore / Keychain entries. Safe to call repeatedly. */
export async function clearSupabaseSecureStoreKeys(): Promise<void> {
  const keys = getSupabaseSecureStoreKeys()
  for (const key of keys) {
    try {
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

    await clearSupabaseSecureStoreKeys()

    // Also nuke any leftover AsyncStorage supabase/sb- keys
    const allKeys = await AsyncStorage.getAllKeys()
    const staleKeys = allKeys.filter(
      (k) => k.startsWith('sb-') || k.startsWith('supabase'),
    )
    if (staleKeys.length > 0) {
      await AsyncStorage.multiRemove(staleKeys)
      console.log('[Boot] Cleared leftover AsyncStorage keys:', staleKeys)
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
