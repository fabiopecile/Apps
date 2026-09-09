import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useReferrals() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    const { count: total } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', session.user.id);
    setCount(total ?? 0);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { count, refresh: load };
}
