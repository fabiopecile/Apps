import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDuels } from '@/hooks/useDuels';
import { useLeagues, useMatchday } from '@/hooks/useTipps';
import { LeagueTabs } from '@/components/LeagueTabs';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

export default function NewDuelScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { challenge } = useDuels();
  const { leagues, loading: leaguesLoading } = useLeagues();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const { matchday } = useMatchday(leagueId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId && leagues.length) setLeagueId(leagues[0].id);
  }, [leagues, leagueId]);

  const search = async (text: string) => {
    setQuery(text);
    if (!text.trim() || !session) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${text.trim()}%`)
      .neq('id', session.user.id)
      .limit(20);
    setResults((data as Profile[]) ?? []);
  };

  const sendChallenge = async (opponent: Profile) => {
    if (!matchday) return;
    setSubmittingId(opponent.id);
    setError(null);
    const { error: challengeError } = await challenge(opponent.id, matchday.id);
    setSubmittingId(null);
    if (challengeError) {
      setError(challengeError);
      return;
    }
    router.replace('/duels');
  };

  if (leaguesLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Neues Duell</Text>
        <View style={{ width: 24 }} />
      </View>

      <LeagueTabs leagues={leagues} selectedId={leagueId} onSelect={setLeagueId} />

      {matchday ? (
        <Text style={styles.matchdayLabel}>Spieltag {matchday.number} · Tippabgabe bis {new Date(matchday.deadline).toLocaleDateString('de-DE')}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Nutzername suchen..."
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={search}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => sendChallenge(item)} disabled={!matchday || submittingId === item.id}>
            <Avatar
              uri={item.avatar_url}
              name={item.display_name ?? item.username}
              size={44}
              ringColor={item.equipped_frame_color ?? undefined}
            />
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.challengeLabel}>Herausfordern</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query ? <EmptyState title="Keine Nutzer gefunden" /> : <EmptyState title="Suche nach Nutzernamen" />
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
    paddingVertical: spacing.md,
  },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  matchdayLabel: { color: colors.textMuted, fontSize: fontSizes.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  input: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm, fontSize: fontSizes.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  username: { flex: 1, color: colors.text, fontWeight: '600', fontSize: fontSizes.md },
  challengeLabel: { color: colors.red, fontWeight: '700', fontSize: fontSizes.xs },
});
