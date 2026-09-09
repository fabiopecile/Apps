import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  // The profile arrives a moment after the session; redirecting before it does
  // would send someone who has already seen the intro through it again.
  if (!profile) return <LoadingScreen />;

  return <Redirect href={profile.onboarding_done ? '/(tabs)' : '/onboarding'} />;
}
