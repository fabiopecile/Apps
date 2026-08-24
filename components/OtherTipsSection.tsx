import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { useMatchTips } from '@/hooks/useMatchTips';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface OtherTipsSectionProps {
  matchId: string;
  currentUserId?: string;
  onOpenProfile?: (userId: string) => void;
}

/**
 * Who tipped what, once the match has kicked off. Half the point of a
 * Tippspiel among friends is comparing afterwards - without this the
 * leaderboard is a list of numbers with no story behind it.
 */
export function OtherTipsSection({ matchId, currentUserId, onOpenProfile }: OtherTipsSectionProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { tips, loading, error } = useMatchTips(matchId, open);

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setOpen((o) => !o)}>
        <Ionicons name="people-outline" size={15} color={colors.textMuted} />
        <Text style={styles.toggleText}>{t('tipps.otherTips')}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.list}>
          {loading ? <ActivityIndicator color={colors.textMuted} style={styles.spinner} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && tips.length === 0 ? (
            <Text style={styles.empty}>{t('tipps.otherTipsEmpty')}</Text>
          ) : null}

          {tips.map((tip) => {
            const isMe = tip.user_id === currentUserId;
            const scored = tip.points_earned != null;
            const won = (tip.points_earned ?? 0) > 0;
            return (
              <Pressable
                key={tip.id}
                style={[styles.row, isMe && styles.rowMe]}
                onPress={() => !isMe && tip.profiles && onOpenProfile?.(tip.profiles.id)}
                disabled={isMe || !tip.profiles}
              >
                <Avatar
                  uri={tip.profiles?.avatar_url}
                  name={tip.profiles?.username}
                  size={28}
                  ringColor={tip.profiles?.equipped_frame_color ?? undefined}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {isMe ? t('tipps.you') : (tip.profiles?.username ?? '?')}
                </Text>

                {tip.joker_type ? (
                  <View style={styles.jokerChip}>
                    <Ionicons name="flash" size={10} color={colors.gold} />
                  </View>
                ) : null}

                <Text style={styles.score}>
                  {tip.home_score}:{tip.away_score}
                </Text>

                {scored ? (
                  <Text style={[styles.points, won ? styles.pointsWon : styles.pointsNone]}>
                    {won ? `+${tip.points_earned}` : '0'}
                  </Text>
                ) : (
                  <Text style={styles.pending}>{t('tipps.pending')}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xs },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  toggleText: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '700' },
  list: { gap: 2, paddingTop: spacing.xs },
  spinner: { paddingVertical: spacing.md },
  error: { color: colors.danger, fontSize: fontSizes.xs, textAlign: 'center', paddingVertical: spacing.sm },
  empty: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowMe: { backgroundColor: colors.surface },
  name: { flex: 1, color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' },
  jokerChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 38,
    textAlign: 'right',
  },
  points: { fontSize: fontSizes.xs, fontWeight: '800', minWidth: 26, textAlign: 'right' },
  pointsWon: { color: colors.success },
  pointsNone: { color: colors.textFaint },
  pending: { color: colors.textFaint, fontSize: fontSizes.xs, minWidth: 26, textAlign: 'right' },
});
