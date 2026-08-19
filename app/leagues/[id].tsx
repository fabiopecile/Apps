import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors, fontSizes, spacing } from '@/constants/theme';
import type { PrivateLeague, Profile } from '@/lib/database.types';

export default function PrivateLeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [league, setLeague] = useState<PrivateLeague | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: leagueRow }, { data: memberRows }] = await Promise.all([
        supabase.from('private_leagues').select('*').eq('id', id).single(),
        supabase
          .from('private_league_members')
          .select('profiles!private_league_members_user_id_fkey(*)')
          .eq('league_id', id),
      ]);

      setLeague((leagueRow as PrivateLeague) ?? null);
      const profiles = ((memberRows as any[]) ?? [])
        .map((row) => row.profiles as Profile)
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);
      setMembers(profiles);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{league?.name ?? 'Liga'}</Text>
          {league ? <Text style={styles.subtitle}>Code: {league.code}</Text> : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <LeaderboardRow profile={item} rank={index + 1} isMe={item.id === session?.user.id} />
        )}
        contentContainerStyle={styles.listContent}
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
  title: { color: colors.white, fontWeight: '900', fontSize: fontSizes.xl },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  listContent: { paddingBottom: spacing.xxl },
});
