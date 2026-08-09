import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { formatMatchTime } from '@/lib/dates';
import type { MatchWithTip } from '@/hooks/useTipps';

interface MatchTipCardProps {
  match: MatchWithTip;
  jokersRemaining: number;
  onSubmit: (homeScore: number, awayScore: number, isJoker: boolean) => Promise<{ error: string | null }>;
}

export function MatchTipCard({ match, jokersRemaining, onSubmit }: MatchTipCardProps) {
  const isLocked = new Date(match.kickoff).getTime() <= Date.now();
  const [homeScore, setHomeScore] = useState(match.tip?.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.tip?.away_score?.toString() ?? '');
  const [isJoker, setIsJoker] = useState(match.tip?.is_joker ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canToggleJoker = !isLocked && (jokersRemaining > 0 || match.tip?.is_joker);
  const canSubmit = !isLocked && homeScore !== '' && awayScore !== '' && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await onSubmit(Number(homeScore), Number(awayScore), isJoker);
    setSubmitting(false);
    if (submitError) setError(submitError);
  };

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{formatMatchTime(match.kickoff)}</Text>
        </View>
        {match.status === 'live' ? (
          <Text style={styles.liveText}>LIVE</Text>
        ) : match.status === 'finished' ? (
          <Text style={styles.ftText}>ENDSTAND</Text>
        ) : null}

        <Pressable
          disabled={!canToggleJoker}
          onPress={() => setIsJoker((v) => !v)}
          style={[styles.jokerButton, isJoker && styles.jokerButtonActive, !canToggleJoker && styles.jokerButtonDisabled]}
        >
          <Text style={[styles.jokerButtonText, isJoker && styles.jokerButtonTextActive]}>⚡ JOKER</Text>
        </Pressable>
      </View>

      <View style={styles.teamsRow}>
        <Text style={styles.teamName}>{match.home_team}</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={[styles.teamName, styles.teamNameRight]}>{match.away_team}</Text>
      </View>

      <View style={styles.scoreRow}>
        <TextInput
          style={[styles.scoreInput, isLocked && styles.scoreInputLocked]}
          value={homeScore}
          onChangeText={(t) => setHomeScore(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="–"
          placeholderTextColor={colors.textFaint}
          editable={!isLocked}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          style={[styles.scoreInput, isLocked && styles.scoreInputLocked]}
          value={awayScore}
          onChangeText={(t) => setAwayScore(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="–"
          placeholderTextColor={colors.textFaint}
          editable={!isLocked}
        />
      </View>

      {match.status === 'finished' && match.home_score !== null && match.away_score !== null ? (
        <Text style={styles.finalScore}>
          Endstand: {match.home_score}:{match.away_score}
          {match.tip?.points_earned !== null && match.tip?.points_earned !== undefined
            ? ` · +${match.tip.points_earned} Punkte`
            : ''}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLocked ? (
        <View style={styles.lockedNotice}>
          <Text style={styles.lockedText}>
            {match.tip ? 'Tipp abgegeben' : 'Tippabgabe geschlossen'}
          </Text>
        </View>
      ) : (
        <Pressable disabled={!canSubmit} onPress={handleSubmit} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
          <Text style={styles.submitText}>{match.tip ? 'Tipp ändern' : 'Tipp abgeben'} ✓</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  timeBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  timeText: { color: colors.textMuted, fontSize: fontSizes.sm },
  liveText: { color: colors.red, fontWeight: '800', fontSize: fontSizes.sm },
  ftText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  jokerButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  jokerButtonActive: { backgroundColor: colors.goldDark, borderColor: colors.gold },
  jokerButtonDisabled: { opacity: 0.4 },
  jokerButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  jokerButtonTextActive: { color: colors.gold },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  teamName: { flex: 1, color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  teamNameRight: { textAlign: 'right' },
  vs: { color: colors.textFaint, fontSize: fontSizes.sm, marginHorizontal: spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.lg },
  scoreInput: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.white,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreInputLocked: { opacity: 0.5 },
  colon: { color: colors.textMuted, fontSize: fontSizes.xl, fontWeight: '700' },
  finalScore: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md, fontSize: fontSizes.sm },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm, fontSize: fontSizes.sm },
  submitButton: {
    backgroundColor: colors.blueDark,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  lockedNotice: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  lockedText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSizes.sm },
});
