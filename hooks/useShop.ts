import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ShopItem } from '@/lib/database.types';

export function useShop() {
  const { session, refreshProfile } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: itemRows }, { data: ownedRows }] = await Promise.all([
      supabase.from('shop_items').select('*').order('sort_order', { ascending: true }),
      session
        ? supabase.from('owned_shop_items').select('item_key').eq('user_id', session.user.id)
        : Promise.resolve({ data: [] as { item_key: string }[] }),
    ]);
    setItems((itemRows as ShopItem[]) ?? []);
    setOwnedKeys(new Set(((ownedRows as { item_key: string }[]) ?? []).map((r) => r.item_key)));
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const buyItem = async (key: string) => {
    const { error } = await supabase.rpc('buy_shop_item', { p_key: key });
    if (!error) {
      await Promise.all([load(), refreshProfile()]);
    }
    return { error: error?.message ?? null };
  };

  const equipItem = async (key: string) => {
    const { error } = await supabase.rpc('equip_shop_item', { p_key: key });
    if (!error) await refreshProfile();
    return { error: error?.message ?? null };
  };

  return { items, ownedKeys, loading, refresh: load, buyItem, equipItem };
}
