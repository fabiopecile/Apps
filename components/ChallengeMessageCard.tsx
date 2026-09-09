import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { DuelType, DuelWithDetails } from '@/lib/database.types';

const DUEL_TYPE_LABEL: Record<DuelType, { icon: keyof typeof Ionicons.glyphMap; title: string }> = {
  tips: { icon: 'locate' as const, title: 'Tipp-Duell' },
  xp: { icon: 'trophy' as const, title: 'Punktewettkampf' },
  streak: { icon: 'flame' as const, title: 'Streak-Battle' },
};

interface ChallengeMessageCardProps {
  duel: DuelWithDetails;
  currentUserId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ChallengeMessageCard({ duel, currentUserId, onAccept, onDecline }: ChallengeMessageCardProps) {
  const isChallenger = duel.challenger_id === currentUserId;
  const opponentUser = isChallenger ? duel.opponent : duel.challenger;
  const meta = DUEL_TYPE_LABEL[duel.duel_type];

  const statusText =
    duel.status === 'pending'
      ? isChallenger
        ? 'Warte auf Antwort...'
        : null
      : duel.status === 'accepted'
        ? 'Läuft'
        : duel.status === 'declined'
          ? 'Abgelehnt'
          : duel.status === 'cancelled'
            ? 'Zurückgezogen'
            : duel.winner_id === currentUserId
              ? 'Gewonnen! +30 XP'
              : duel.winner_id === opponentUser.id
                ? 'Verloren'
                : 'Unentschieden';

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name={meta.icon} size={15} color={colors.black} />
        <Text style={styles.title}>{meta.title}</Text>
      </View>
      <Text style={styles.subtitle}>Spieltag {duel.matchday.number} · {duel.matchday.league.name}</Text>

      {duel.status === 'pending' && !isChallenger ? (
        <View style={styles.actions}>
          <Pressable style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Ablehnen</Text>
          </Pressable>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>Annehmen</Text>
          </Pressable>
        </View>
      ) : statusText ? (
        <Text style={styles.status}>{statusText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.md,
    maxWidth: '82%',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { color: colors.black, fontWeight: '800', fontSize: fontSizes.md },
  subtitle: { color: colors.black, fontSize: fontSizes.xs, opacity: 0.75, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  declineButton: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  declineText: { color: colors.black, fontWeight: '700', fontSize: fontSizes.xs },
  acceptButton: { flex: 1, backgroundColor: colors.black, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  acceptText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.xs },
  status: { color: colors.black, fontWeight: '700', fontSize: fontSizes.xs },
});
