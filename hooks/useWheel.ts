import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { WheelSpinResult } from '@/lib/database.types';

export function useWheel() {
  const { profile, refreshProfile } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const canSpin = profile ? profile.last_wheel_spin_date !== today : false;

  const spin = async (): Promise<WheelSpinResult> => {
    const { data, error } = await supabase.rpc('spin_wheel');
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('Kein Ergebnis erhalten');
    await refreshProfile();
    return result;
  };

  return { canSpin, spin };
}
