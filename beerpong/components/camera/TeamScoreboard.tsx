import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';
import type { TeamIndex, TrackerTeam } from '@/lib/store';
import { useT } from '@/lib/i18n';

interface TeamScoreboardProps {
  teams: [TrackerTeam, TrackerTeam];
  activeTeam: TeamIndex;
  startCups: number;
  onSelectTeam: (team: TeamIndex) => void;
  onRenameTeam: (team: TeamIndex, name: string) => void;
}

/** Both teams' remaining cups side by side, with the team on throw highlighted. */
export function TeamScoreboard({
  teams,
  activeTeam,
  startCups,
  onSelectTeam,
  onRenameTeam,
}: TeamScoreboardProps) {
  return (
    <View style={styles.row}>
      <TeamColumn
        team={teams[0]}
        index={0}
        active={activeTeam === 0}
        startCups={startCups}
        onSelect={onSelectTeam}
        onRename={onRenameTeam}
      />
      <View style={styles.divider}>
        <Text style={styles.dividerText} selectable={false}>
          VS
        </Text>
      </View>
      <TeamColumn
        team={teams[1]}
        index={1}
        active={activeTeam === 1}
        startCups={startCups}
        onSelect={onSelectTeam}
        onRename={onRenameTeam}
      />
    </View>
  );
}

function TeamColumn({
  team,
  index,
  active,
  startCups,
  onSelect,
  onRename,
}: {
  team: TrackerTeam;
  index: TeamIndex;
  active: boolean;
  startCups: number;
  onSelect: (team: TeamIndex) => void;
  onRename: (team: TeamIndex, name: string) => void;
}) {
  const scale = useSharedValue(1);
  const previousCups = useRef(team.cupsLeft);
  const t = useT();

  useEffect(() => {
    if (team.cupsLeft !== previousCups.current) {
      previousCups.current = team.cupsLeft;
      scale.value = withSequence(
        withSpring(1.22, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 9, stiffness: 200 })
      );
    }
  }, [team.cupsLeft, scale]);

  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable style={styles.column} onPress={() => onSelect(index)}>
      <View style={[styles.nameRow, active && styles.nameRowActive]}>
        {active ? <Ionicons name="ellipse" size={7} color={colors.neon} /> : null}
        <TextInput
          value={team.name}
          onChangeText={(text) => onRename(index, text.slice(0, 14))}
          style={[styles.nameInput, active && { color: colors.neon }]}
          maxLength={14}
          selectTextOnFocus
        />
      </View>

      <Animated.Text
        style={[styles.count, active && styles.countActive, countStyle]}
        selectable={false}
      >
        {team.cupsLeft}
      </Animated.Text>

      <View style={styles.cupRow}>
        {Array.from({ length: startCups }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.cupPip,
              i < team.cupsLeft
                ? { backgroundColor: active ? colors.neon : colors.textSecondary }
                : styles.cupPipGone,
            ]}
          />
        ))}
      </View>

      <Text style={styles.meta} selectable={false}>
        {t('tracker.throwsMeta', {
          hits: team.hits,
          throws: team.throws,
          streak: team.streak,
        })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    paddingTop: 26,
    paddingHorizontal: spacing.xs,
  },
  dividerText: {
    fontFamily: fonts.headingBlack,
    fontSize: 13,
    color: colors.textMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  nameRowActive: {
    borderColor: colors.border,
    backgroundColor: colors.neonFaint,
  },
  nameInput: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
    minWidth: 70,
    padding: 0,
  },
  count: {
    fontFamily: fonts.numeric,
    fontSize: 54,
    lineHeight: 60,
    color: colors.textSecondary,
  },
  countActive: {
    color: colors.neon,
    textShadowColor: colors.neonGlow,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  cupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
    maxWidth: 120,
    marginTop: 2,
  },
  cupPip: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  cupPipGone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  meta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
});
