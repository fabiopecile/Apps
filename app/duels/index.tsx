import { useMemo } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DuelCard } from '@/components/DuelCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useDuels } from '@/hooks/useDuels';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSizes, spacing } from '@/constants/theme';
import type { DuelWithDetails } from '@/lib/database.types';

export default function DuelsScreen() {
  const { session } = useAuth();
  const { duels, loading, respond, cancel } = useDuels();
  const router = useRouter();
  const myId = session?.user.id;

  const sections = useMemo(() => {
    if (!myId) return [];
    const incoming = duels.filter((d) => d.status === 'pending' && d.opponent_id === myId);
    const outgoing = duels.filter((d) => d.status === 'pending' && d.challenger_id === myId);
    const active = duels.filter((d) => d.status === 'accepted');
    const history = duels.filter((d) => ['completed', 'declined', 'cancelled'].includes(d.status));

    return [
      { title: 'Einladungen', data: incoming },
      { title: 'Ausstehend', data: outgoing },
      { title: 'Aktive Duelle', data: active },
      { title: 'Verlauf', data: history },
    ].filter((s) => s.data.length > 0);
  }, [duels, myId]);

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Duelle</Text>
        <Pressable onPress={() => router.push('/duels/new')}>
          <Ionicons name="add-circle" size={26} color={colors.red} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>}
        renderItem={({ item }: { item: DuelWithDetails }) =>
          myId ? (
            <DuelCard
              duel={item}
              currentUserId={myId}
              onAccept={() => respond(item.id, true)}
              onDecline={() => respond(item.id, false)}
              onCancel={() => cancel(item.id)}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Noch keine Duelle"
            subtitle="Fordere einen Freund für den aktuellen Spieltag heraus."
          />
        }
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: { paddingBottom: spacing.xxl },
});
