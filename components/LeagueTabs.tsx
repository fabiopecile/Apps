import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { League } from '@/lib/database.types';

interface LeagueTabsProps {
  leagues: League[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LeagueTabs({ leagues, selectedId, onSelect }: LeagueTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {leagues.map((league) => {
        const active = league.id === selectedId;
        return (
          <Pressable
            key={league.id}
            onPress={() => onSelect(league.id)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={styles.flag}>{league.flag_emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{league.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView is still a flex child of the column above it, so
  // it gets shrunk when the list below competes for space - which cut the
  // league pills in half. Pinning both flex factors makes it size to its own
  // content and nothing else.
  scroll: { flexGrow: 0, flexShrink: 0 },
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.redDark,
    borderColor: colors.red,
  },
  flag: { fontSize: fontSizes.md },
  label: { color: colors.textMuted, fontWeight: '600', fontSize: fontSizes.sm },
  labelActive: { color: colors.white },
});
