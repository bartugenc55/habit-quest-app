/**
 * Auth persistence constants — imported by BOTH supabase.ts and firstRunReset.ts.
 *
 * This file must have NO imports from supabase.ts / supabase-js so that
 * firstRunReset.ts can load these constants without triggering the Supabase
 * package to be evaluated before the boot-time cleanup runs.
 */

/** Keychain service used by the SecureStore adapter passed to Supabase createClient(). */
export const KEYCHAIN_SERVICE = 'com.bartugenc.habitquestapp.auth'

/**
 * The storageKey passed to createClient() — the exact key name Supabase uses
 * to read/write the session in SecureStore.
 */
export const STORAGE_KEY = 'sb-auth-token'

/**
 * Legacy key used by previous versions of this app that computed the key
 * dynamically from the Supabase project ref.
 * Hardcoded so cleanup works even without URL parsing.
 */
export const LEGACY_STORAGE_KEY = 'sb-xffqvpvqzxlgnuqpleyr-auth-token'
