import { Redirect } from 'expo-router';
import { useBeerpongStore } from '@/lib/store';

export default function Index() {
  const onboardingDone = useBeerpongStore((s) => s.onboardingDone);
  // The store is already rehydrated here — the root layout renders nothing
  // until it is, so this never flashes the wrong screen.
  return <Redirect href={onboardingDone ? '/(tabs)/camera' : '/onboarding'} />;
}
