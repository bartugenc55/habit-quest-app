import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = "https://xffqvpvqzxlgnuqpleyr.supabase.co"
const supabaseAnonKey = "sb_publishable_je4Tnda-o5G8Kqh5R7-e6w_4TkynCTZ"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

