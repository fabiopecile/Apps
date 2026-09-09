import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useModeration } from '@/hooks/useModeration';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';
import { useTranslation } from '@/hooks/useTranslation';

type BlockedProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { blockedIds, unblockUser } = useModeration();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ids = Array.from(blockedIds);
  const idKey = ids.join(',');

  const load = useCallback(async () => {
    if (ids.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);
    setError(loadError?.message ?? null);
    setProfiles(data ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = async (userId: string) => {
    const { error: unblockError } = await unblockUser(userId);
    if (unblockError) setError(unblockError);
    else setProfiles((current) => current.filter((p) => p.id !== userId));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('blocked.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.avatar_url} name={item.display_name ?? item.username} size={44} />
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.display_name ?? item.username}</Text>
              <Text style={styles.handle}>@{item.username}</Text>
            </View>
            <Pressable style={styles.unblockButton} onPress={() => handleUnblock(item.id)}>
              <Text style={styles.unblockText}>{t('blocked.unblock')}</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={t('blocked.empty')}
              subtitle={t('blocked.emptySubtitle')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  error: { color: colors.danger, fontSize: fontSizes.sm, padding: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  handle: { color: colors.textFaint, fontSize: fontSizes.xs },
  unblockButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  unblockText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.xs },
});
