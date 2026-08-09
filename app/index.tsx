import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
