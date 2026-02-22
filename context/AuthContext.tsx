import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabase } from '../utils/supabase'
import { clearSupabaseSecureStoreKeys } from '../utils/firstRunReset'

// ── Dev Auth Bypass ─────────────────────────────────────────────────
// Set to `true` to skip login screens and use a mock user during development.
// Set back to `false` to re-enable real authentication.
const DEV_AUTH_BYPASS = false;

const DEV_MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@localhost',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
} as unknown as User;

const DEV_MOCK_SESSION = {
  access_token: 'dev-token',
  refresh_token: 'dev-token',
  expires_in: 999999,
  token_type: 'bearer',
  user: DEV_MOCK_USER,
} as unknown as Session;
// ────────────────────────────────────────────────────────────────────

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Guard: prevent the auth listener from re-setting user during signOut
  const signingOut = useRef(false)

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      setUser(DEV_MOCK_USER)
      setSession(DEV_MOCK_SESSION)
      setIsLoading(false)
      return
    }

    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data }) => {
      if (signingOut.current) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
      // Log in the exact format required so Xcode shows a clear proof line
      if (data.session) {
        console.log(`[Auth] getSession result = ${data.session.user.email ?? data.session.user.id}`)
      } else {
        console.log('[Auth] getSession result = null')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      console.log('[Auth] onAuthStateChange:', _event, sess?.user?.email ?? 'null')
      if (signingOut.current) return
      setSession(sess)
      setUser(sess?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithOtp = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await getSupabase().auth.signInWithOtp({ email })
    return { error: error?.message ?? null }
  }

  const verifyOtp = async (email: string, token: string): Promise<{ error: string | null }> => {
    const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (DEV_AUTH_BYPASS) return

    console.log('[Auth] signOut START')
    // 1. Set guard so the auth state-change listener can't re-set user
    signingOut.current = true

    // 2. Immediately clear in-memory state → UI switches to AuthScreen NOW
    setUser(null)
    setSession(null)

    // 3. Tell Supabase to clear its own stored tokens (calls removeItem on adapter)
    try {
      await getSupabase().auth.signOut({ scope: 'local' })
    } catch (e) {
      console.error('[Auth] supabase.signOut error:', e)
    }

    // 4. Belt-and-suspenders: nuke all known Supabase Keychain entries
    //    (covers both KEYCHAIN_SERVICE and default "app" service)
    try {
      await clearSupabaseSecureStoreKeys()
    } catch (e) {
      console.error('[Auth] clearSupabaseSecureStoreKeys error:', e)
    }

    // 5. Remove any lingering AsyncStorage sb-* / supabase* entries
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const sbKeys = allKeys.filter(
        (k) => k.startsWith('sb-') || k.startsWith('supabase'),
      )
      if (sbKeys.length > 0) {
        await AsyncStorage.multiRemove(sbKeys)
        console.log('[Auth] removed AsyncStorage supabase keys:', sbKeys)
      }
    } catch (e) {
      console.error('[Auth] clear AsyncStorage supabase keys error:', e)
    }

    // 6. Clear cached profile & premium — DO NOT clear onboarding flag
    try {
      await AsyncStorage.removeItem('@habitquest_profile')
      await AsyncStorage.removeItem('@habitquest_premium')
    } catch (e) {
      console.error('[Auth] clear profile/premium error:', e)
    }

    // 7. Release guard so future logins work normally
    signingOut.current = false
    console.log('[Auth] signOut END')
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
