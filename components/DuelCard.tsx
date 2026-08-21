import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { DuelType, DuelWithDetails } from '@/lib/database.types';

const DUEL_TYPE_LABEL: Record<DuelType, { emoji: string; title: string }> = {
  tips: { emoji: '🎯', title: 'Tipp-Duell' },
  xp: { emoji: '🏆', title: 'Punktewettkampf' },
  streak: { emoji: '🔥', title: 'Streak-Battle' },
};

interface DuelCardProps {
  duel: DuelWithDetails;
  currentUserId: string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}

export function DuelCard({ duel, currentUserId, onAccept, onDecline, onCancel }: DuelCardProps) {
  const isChallenger = duel.challenger_id === currentUserId;
  const opponentUser = isChallenger ? duel.opponent : duel.challenger;
  const myPoints = isChallenger ? duel.challenger_points : duel.opponent_points;
  const theirPoints = isChallenger ? duel.opponent_points : duel.challenger_points;

  const result =
    duel.status === 'completed'
      ? duel.winner_id === currentUserId
        ? 'win'
        : duel.winner_id === opponentUser.id
          ? 'loss'
          : 'draw'
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar
          uri={opponentUser.avatar_url}
          name={opponentUser.username}
          size={44}
          ringColor={opponentUser.equipped_frame_color ?? undefined}
        />
        <View style={styles.headerText}>
          <Text style={styles.username}>
            {DUEL_TYPE_LABEL[duel.duel_type].emoji} vs. {opponentUser.username}
          </Text>
          <Text style={styles.matchday}>
            {DUEL_TYPE_LABEL[duel.duel_type].title} · {duel.matchday.league.flag_emoji} Spieltag {duel.matchday.number}
          </Text>
        </View>
        {result ? (
          <View style={[styles.resultBadge, result === 'win' && styles.resultWin, result === 'loss' && styles.resultLoss]}>
            <Text style={styles.resultText}>{result === 'win' ? 'Sieg' : result === 'loss' ? 'Niederlage' : 'Unentschieden'}</Text>
          </View>
        ) : null}
      </View>

      {duel.duel_type === 'tips' && (duel.status === 'accepted' || duel.status === 'completed') ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{myPoints}</Text>
          <Text style={styles.scoreLabel}>Du</Text>
          <Text style={styles.scoreDivider}>:</Text>
          <Text style={styles.scoreLabel}>{opponentUser.username}</Text>
          <Text style={styles.scoreValue}>{theirPoints}</Text>
        </View>
      ) : null}

      {duel.duel_type !== 'tips' && duel.status === 'accepted' ? (
        <Text style={styles.liveNotice}>Läuft bis Spieltag-Ende</Text>
      ) : null}

      {duel.status === 'pending' && !isChallenger ? (
        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.declineButton]} onPress={onDecline}>
            <Text style={styles.declineText}>Ablehnen</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.acceptText}>Annehmen</Text>
          </Pressable>
        </View>
      ) : null}

      {duel.status === 'pending' && isChallenger ? (
        <View style={styles.actions}>
          <Text style={styles.waitingText}>Warte auf Antwort...</Text>
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelText}>Zurückziehen</Text>
          </Pressable>
        </View>
      ) : null}

      {duel.status === 'declined' ? <Text style={styles.declinedText}>Herausforderung abgelehnt</Text> : null}
      {duel.status === 'cancelled' ? <Text style={styles.declinedText}>Herausforderung zurückgezogen</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1 },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  matchday: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  resultBadge: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  resultWin: { backgroundColor: colors.redDark },
  resultLoss: { backgroundColor: colors.surfaceAlt },
  resultText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  scoreValue: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  scoreLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  scoreDivider: { color: colors.textFaint, fontSize: fontSizes.lg },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm },
  actionButton: { flex: 1, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  declineButton: { borderWidth: 1, borderColor: colors.borderStrong },
  declineText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.sm },
  acceptButton: { backgroundColor: colors.redDark, borderWidth: 1, borderColor: colors.red },
  acceptText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  waitingText: { color: colors.textMuted, fontSize: fontSizes.sm },
  cancelText: { color: colors.danger, fontSize: fontSizes.sm, fontWeight: '600' },
  declinedText: { color: colors.textFaint, fontSize: fontSizes.sm, marginTop: spacing.md, textAlign: 'center' },
  liveNotice: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.lg, textAlign: 'center' },
});
