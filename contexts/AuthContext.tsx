import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { parseAuthTokens } from '@/lib/authLinks';
import { registerForPushNotifications } from '@/lib/notifications';
import type { Profile } from '@/lib/database.types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    referralCode?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) ?? null);
    if ((data as Profile | null)?.notifications_enabled) {
      registerForPushNotifications(userId).catch(() => {});
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      // Someone who arrived through the reset link is signed in but still has
      // their old password, so send them straight to the change screen.
      if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password');
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Native gets the reset link as a deep link, which supabase-js doesn't read
  // on its own (detectSessionInUrl is web-only), so exchange the tokens here.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const tokens = parseAuthTokens(url);
      if (!tokens) return;
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (!error && url.includes('reset-password')) router.replace('/reset-password');
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password, username, referralCode) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, referral_code: referralCode?.trim() || undefined } },
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
