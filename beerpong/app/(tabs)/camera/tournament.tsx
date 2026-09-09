import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Confetti } from '@/components/ui/Confetti';
import {
  MAX_TEAMS,
  MIN_TEAMS,
  nextPlayableMatch,
  roundNameKey,
  totalRoundsFor,
  type TournamentMatch,
} from '@/lib/tournament';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function TournamentScreen() {
  const tournament = useBeerpongStore((s) => s.tournament);
  const tournamentStart = useBeerpongStore((s) => s.tournamentStart);
  const tournamentReportWinner = useBeerpongStore((s) => s.tournamentReportWinner);
  const tournamentReset = useBeerpongStore((s) => s.tournamentReset);
  const trackerNewGame = useBeerpongStore((s) => s.trackerNewGame);
  const trackerSetTeamName = useBeerpongStore((s) => s.trackerSetTeamName);
  const feedback = useFeedback();
  const t = useT();

  const [draft, setDraft] = useState<string[]>(['', '', '', '']);

  const validTeams = draft.map((t) => t.trim()).filter((t) => t.length > 0);
  const canStart = validTeams.length >= MIN_TEAMS;

  const start = () => {
    feedback.tap();
    tournamentStart(validTeams);
  };

  /** Loads a bracket match into the live tracker and jumps there. */
  const playInTracker = (match: TournamentMatch) => {
    if (!match.teamA || !match.teamB) return;
    feedback.tap();
    trackerNewGame();
    trackerSetTeamName(0, match.teamA);
    trackerSetTeamName(1, match.teamB);
    router.push('/(tabs)/camera');
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('tournament.title')}</Text>
          {tournament ? (
            <Pressable onPress={tournamentReset} hitSlop={10}>
              <Ionicons name="trash" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!tournament ? (
            <SetupView
              draft={draft}
              setDraft={setDraft}
              canStart={canStart}
              teamCount={validTeams.length}
              onStart={start}
            />
          ) : (
            <BracketView
              matches={tournament.matches}
              teamCount={tournament.teams.length}
              champion={tournament.champion}
              onReport={(matchId, winner) => {
                feedback.cupHit();
                tournamentReportWinner(matchId, winner);
              }}
              onPlay={playInTracker}
              onReset={tournamentReset}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {tournament?.champion ? <Confetti /> : null}
    </View>
  );
}

function SetupView({
  draft,
  setDraft,
  canStart,
  teamCount,
  onStart,
}: {
  draft: string[];
  setDraft: (teams: string[]) => void;
  canStart: boolean;
  teamCount: number;
  onStart: () => void;
}) {
  const t = useT();

  const update = (index: number, value: string) => {
    const next = [...draft];
    next[index] = value.slice(0, 16);
    setDraft(next);
  };

  return (
    <>
      <Text style={styles.intro}>
        {t('tournament.intro', { min: MIN_TEAMS, max: MAX_TEAMS })}
      </Text>

      <SectionLabel>{t('tournament.teams')}</SectionLabel>
      {draft.map((team, index) => (
        <View key={index} style={styles.teamInputRow}>
          <View style={styles.teamNumber}>
            <Text style={styles.teamNumberText} selectable={false}>
              {index + 1}
            </Text>
          </View>
          <TextInput
            value={team}
            onChangeText={(text) => update(index, text)}
            placeholder={`Team ${index + 1}`}
            placeholderTextColor={colors.textMuted}
            style={styles.teamInput}
            maxLength={16}
          />
          {draft.length > MIN_TEAMS ? (
            <Pressable
              onPress={() => setDraft(draft.filter((_, i) => i !== index))}
              hitSlop={8}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {draft.length < MAX_TEAMS ? (
        <Pressable style={styles.addButton} onPress={() => setDraft([...draft, ''])}>
          <Ionicons name="add" size={18} color={colors.neon} />
          <Text style={styles.addButtonText} selectable={false}>
            {t('tournament.addTeam')}
          </Text>
        </Pressable>
      ) : null}

      <GlowButton
        label={
          canStart
            ? t('tournament.start', { count: teamCount })
            : t('tournament.needMore', { min: MIN_TEAMS })
        }
        size="lg"
        disabled={!canStart}
        onPress={onStart}
        style={styles.startButton}
      />
    </>
  );
}

function BracketView({
  matches,
  teamCount,
  champion,
  onReport,
  onPlay,
  onReset,
}: {
  matches: TournamentMatch[];
  teamCount: number;
  champion: string | null;
  onReport: (matchId: string, winner: string) => void;
  onPlay: (match: TournamentMatch) => void;
  onReset: () => void;
}) {
  const rounds = totalRoundsFor(teamCount);
  const upNext = nextPlayableMatch(matches);
  const t = useT();

  return (
    <>
      {champion ? (
        <View style={[styles.championCard, glow('medium', colors.gold)]}>
          <Ionicons name="trophy" size={40} color={colors.gold} />
          <Text style={styles.championLabel} selectable={false}>
            {t('tournament.champion')}
          </Text>
          <Text style={styles.championName} selectable={false}>
            {champion}
          </Text>
          <GlowButton
            label={t('tournament.newTournament')}
            size="sm"
            onPress={onReset}
            style={styles.championButton}
          />
        </View>
      ) : upNext ? (
        <View style={[styles.upNextCard, glow('soft')]}>
          <Text style={styles.upNextLabel} selectable={false}>
            {t('tournament.upNext')}
          </Text>
          <Text style={styles.upNextMatch} selectable={false}>
            {upNext.teamA} vs. {upNext.teamB}
          </Text>
          <GlowButton
            label={t('tournament.playInTracker')}
            size="sm"
            onPress={() => onPlay(upNext)}
            style={styles.upNextButton}
          />
        </View>
      ) : null}

      {Array.from({ length: rounds }).map((_, i) => {
        const round = i + 1;
        const roundMatches = matches.filter((m) => m.round === round);
        return (
          <View key={round} style={styles.roundSection}>
            <SectionLabel>{t(roundNameKey(round, rounds), { round })}</SectionLabel>
            {roundMatches.map((match) => (
              <MatchRow key={match.id} match={match} onReport={onReport} />
            ))}
          </View>
        );
      })}
    </>
  );
}

function MatchRow({
  match,
  onReport,
}: {
  match: TournamentMatch;
  onReport: (matchId: string, winner: string) => void;
}) {
  const pending = !match.winner && match.teamA && match.teamB;
  const t = useT();

  return (
    <View style={[styles.matchCard, match.winner != null && styles.matchCardDone]}>
      {[match.teamA, match.teamB].map((team, side) => {
        const isWinner = match.winner != null && match.winner === team;
        return (
          <Pressable
            key={side}
            disabled={!pending || !team}
            onPress={() => team && onReport(match.id, team)}
            style={({ pressed }) => [
              styles.matchSide,
              isWinner && styles.matchSideWinner,
              pressed && pending && styles.matchSidePressed,
            ]}
          >
            <Text
              style={[
                styles.matchTeam,
                !team && { color: colors.textMuted },
                isWinner && { color: colors.neon },
              ]}
              selectable={false}
              numberOfLines={1}
            >
              {team ?? t('tournament.open')}
            </Text>
            {isWinner ? <Ionicons name="checkmark-circle" size={16} color={colors.neon} /> : null}
            {pending && team ? (
              <Text style={styles.matchPick} selectable={false}>
                {t('tournament.wins')}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  teamInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  teamNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNumberText: {
    fontFamily: fonts.numeric,
    fontSize: 13,
    color: colors.neon,
  },
  teamInput: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  addButtonText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.neon,
  },
  startButton: {
    marginTop: spacing.lg,
  },
  championCard: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.lg,
  },
  championLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  championName: {
    fontFamily: fonts.headingBlack,
    fontSize: 28,
    color: colors.gold,
    textAlign: 'center',
  },
  championButton: {
    marginTop: spacing.md,
  },
  upNextCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  upNextLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  upNextMatch: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  upNextButton: {
    marginTop: spacing.md,
  },
  roundSection: {
    marginTop: spacing.md,
  },
  matchCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  matchCardDone: {
    borderColor: colors.border,
  },
  matchSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  matchSideWinner: {
    backgroundColor: colors.neonFaint,
  },
  matchSidePressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  matchTeam: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  matchPick: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
