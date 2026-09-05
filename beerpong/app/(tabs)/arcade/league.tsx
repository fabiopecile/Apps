import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Card } from '@/components/ui/Card';
import { LEAGUE_OPPONENTS, type Opponent } from '@/lib/opponents';
import { useBeerpongStore } from '@/lib/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function LeagueScreen() {
  const defeatedIds = useBeerpongStore((s) => s.arcade.defeatedOpponentIds);
  const setCurrentOpponentId = useBeerpongStore((s) => s.setCurrentOpponentId);

  const challenge = (opponent: Opponent) => {
    setCurrentOpponentId(opponent.id);
    router.back();
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Liga</Text>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={LEAGUE_OPPONENTS}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const defeated = defeatedIds.includes(item.id);
            return (
              <Card style={styles.opponentCard} highlighted={defeated}>
                <View style={[styles.avatar, { borderColor: item.color }]}>
                  <Text style={[styles.avatarText, { color: item.color }]}>{index + 1}</Text>
                </View>
                <View style={styles.opponentInfo}>
                  <Text style={styles.opponentName}>{item.name}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < item.difficulty ? 'star' : 'star-outline'}
                        size={12}
                        color={i < item.difficulty ? colors.gold : colors.textMuted}
                      />
                    ))}
                  </View>
                </View>
                {defeated ? (
                  <View style={styles.defeatedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.neon} />
                    <Text style={styles.defeatedText}>Besiegt</Text>
                  </View>
                ) : (
                  <Pressable style={styles.challengeButton} onPress={() => challenge(item)}>
                    <Text style={styles.challengeText}>Fordern</Text>
                  </Pressable>
                )}
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  opponentCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.displayBlack,
    fontSize: 16,
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  challengeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neon,
  },
  challengeText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  defeatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defeatedText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
  },
});
