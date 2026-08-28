import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Profile = { id: string; username: string }

type AuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  profile: Profile | null
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()
  if (existing) return existing as Profile

  const desired =
    (user.user_metadata?.username as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    'Spieler'

  let username = desired
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username })
      .select('id, username')
      .single()
    if (!error) return data as Profile
    if (error.code === '23505') {
      username = `${desired}${Math.floor(Math.random() * 10000)}`
      continue
    }
    return null
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) setProfile(await ensureProfile(sessionUser))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        setProfile(await ensureProfile(sessionUser))
      } else {
        setProfile(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, username: string) {
    if (!supabase) return { error: 'Kein Backend konfiguriert.', needsConfirmation: false }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) return { error: error.message, needsConfirmation: false }
    if (data.session && data.user) {
      setProfile(await ensureProfile(data.user))
      return { error: null, needsConfirmation: false }
    }
    return { error: null, needsConfirmation: true }
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: 'Kein Backend konfiguriert.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ configured: isSupabaseConfigured, loading, user, profile, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
