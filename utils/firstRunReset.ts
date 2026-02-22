import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
// Import from authConstants — NOT from supabase.ts — so loading this file
// does NOT trigger the supabase-js package to be evaluated before cleanup.
import { KEYCHAIN_SERVICE, STORAGE_KEY, LEGACY_STORAGE_KEY } from './authConstants'

const FIRST_RUN_KEY = 'hq_first_run_done_v1'

/**
 * Every key name that Supabase auth may have written to the Keychain across
 * all versions of this app:
 *   - Main session  : STORAGE_KEY
 *   - Code verifier : STORAGE_KEY + "-code-verifier"   (PKCE flow)
 *   - User object   : STORAGE_KEY + "-user"            (supabase-js v2.94+)
 *   - Legacy project-ref variants from older app versions
 *   - Generic v1 key names
 *
 * Each name is tried against BOTH keychainService values (custom + default)
 * so tokens from every historical version of the app are erased.
 */
function allSecureStoreKeyNames(): string[] {
  return [
    // ── Current key (STORAGE_KEY passed to createClient storageKey) ──
    STORAGE_KEY,
    `${STORAGE_KEY}-code-verifier`,
    `${STORAGE_KEY}-user`,

    // ── Old project-ref key from previous implementations ──
    LEGACY_STORAGE_KEY,
    `${LEGACY_STORAGE_KEY}-code-verifier`,
    `${LEGACY_STORAGE_KEY}-user`,

    // ── Generic legacy supabase-js v1 key names ──
    'supabase.auth.token',
    'supabase.auth.refreshToken',
    'supabase.auth.expiresAt',
  ]
}

/**
 * Delete one SecureStore key from a specific keychain service.
 * expo-secure-store natively tries all three variants of a key
 * (legacy / :no-auth / :auth) on every delete call, so a single
 * deleteItemAsync covers all accessibility variants.
 */
async function deleteSecureKey(key: string, service?: string): Promise<void> {
  const svcLabel = service ?? 'app'  // expo-secure-store default service = "app"
  console.log(`[Boot] deleting key: ${key} (service: ${svcLabel})`)
  try {
    if (service) {
      await SecureStore.deleteItemAsync(key, { keychainService: service })
    } else {
      await SecureStore.deleteItemAsync(key)
    }
    console.log(`[Boot] deleting key: ${key} → ok`)
  } catch {
    console.log(`[Boot] deleting key: ${key} → fail`)
  }
}

/**
 * Wipe every known Supabase Keychain entry.
 * Tries BOTH keychainService variants per key:
 *   1. KEYCHAIN_SERVICE  — tokens written by the current SecureStore adapter
 *   2. (no service)      — expo-secure-store default = "app"; covers older code
 *
 * Safe to call repeatedly; non-existent keys are silently ignored.
 */
export async function clearSupabaseSecureStoreKeys(): Promise<void> {
  for (const key of allSecureStoreKeyNames()) {
    await deleteSecureKey(key, KEYCHAIN_SERVICE)  // custom service
    await deleteSecureKey(key)                    // default service ("app")
  }
}

/**
 * On a fresh install (FIRST_RUN_KEY absent from AsyncStorage — cleared on
 * iOS app deletion), wipe all Keychain/SecureStore auth entries left by a
 * previous installation.
 *
 * MUST be called BEFORE getSupabase() / createClient() is ever invoked.
 */
export async function resetAuthOnFreshInstallIfNeeded(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(FIRST_RUN_KEY)
    if (done) {
      console.log('[Boot] freshInstall = false')
      return
    }

    console.log('[Boot] freshInstall = true')

    // ── 1. SecureStore / Keychain ──────────────────────────────────────────
    await clearSupabaseSecureStoreKeys()

    // ── 2. AsyncStorage (sb-* and supabase*) ──────────────────────────────
    // AsyncStorage is cleared on iOS app deletion, but wipe any sb-/supabase*
    // keys defensively (relevant on Android or if storage survived somehow).
    let allKeys: readonly string[] = []
    try {
      allKeys = await AsyncStorage.getAllKeys()
    } catch {
      // ignore — getAllKeys failing should not block the rest of cleanup
    }
    const staleAsKeys = allKeys.filter(
      (k) => k.startsWith('sb-') || k.startsWith('supabase'),
    )
    for (const k of staleAsKeys) {
      console.log(`[Boot] deleting AsyncStorage key: ${k}`)
    }
    if (staleAsKeys.length > 0) {
      await AsyncStorage.multiRemove(staleAsKeys as string[])
    }

    console.log('[Boot] cleanup END')
    await AsyncStorage.setItem(FIRST_RUN_KEY, '1')
  } catch (e) {
    console.error('[Boot] resetAuthOnFreshInstallIfNeeded error:', e)
    // Even if cleanup throws, mark as done so we don't re-run on every boot.
    try { await AsyncStorage.setItem(FIRST_RUN_KEY, '1') } catch {}
  }
}
