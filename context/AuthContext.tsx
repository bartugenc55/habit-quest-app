import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../utils/supabase'

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
    // When DEV_AUTH_BYPASS is enabled, skip real auth and use mock data
    if (DEV_AUTH_BYPASS) {
      setUser(DEV_MOCK_USER)
      setSession(DEV_MOCK_SESSION)
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (signingOut.current) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
      console.log('[Auth] initial session:', data.session ? data.session.user.email : 'NONE')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      console.log('[Auth] onAuthStateChange:', _event, sess?.user?.email ?? 'null')
      // If we're in the middle of signing out, ignore any auth events
      // (autoRefreshToken could fire and re-set user)
      if (signingOut.current) return
      setSession(sess)
      setUser(sess?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithOtp = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error: error?.message ?? null }
  }

  const verifyOtp = async (email: string, token: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (DEV_AUTH_BYPASS) return

    console.log('[Auth] signOut started')
    // 1. Set guard so the auth listener can't re-set user
    signingOut.current = true

    // 2. Immediately clear in-memory state → UI updates NOW
    setUser(null)
    setSession(null)

    // 3. Call Supabase signOut (clears stored tokens from AsyncStorage)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      console.error('[Auth] supabase.signOut error:', e)
    }

    // 4. Belt-and-suspenders: nuke any leftover Supabase session keys
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const sbKeys = allKeys.filter((k) => k.startsWith('sb-'))
      if (sbKeys.length > 0) {
        await AsyncStorage.multiRemove(sbKeys)
        console.log('[Auth] removed stale sb- keys:', sbKeys)
      }
    } catch (e) {
      console.error('[Auth] clear sb- keys error:', e)
    }

    // 5. Clear cached profile so old name doesn't persist
    try {
      await AsyncStorage.removeItem('@habitquest_profile')
    } catch (e) {
      console.error('[Auth] clear profile error:', e)
    }

    // 6. Release the guard so future logins work
    signingOut.current = false
    console.log('[Auth] signOut complete – session, profile & sb-keys cleared')
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
