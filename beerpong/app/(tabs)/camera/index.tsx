import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GridBackground } from '@/components/ui/GridBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { HouseRulesPanel } from '@/components/camera/HouseRulesPanel';
import { TeamScoreboard } from '@/components/camera/TeamScoreboard';
import { AutoDetect } from '@/components/camera/AutoDetect';
import { ShareResultButton } from '@/components/ui/ShareableResult';
import { useBeerpongStore, type TeamIndex } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

export default function CameraTrackerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [rulesVisible, setRulesVisible] = useState(false);
  const [detectVisible, setDetectVisible] = useState(false);

  const tracker = useBeerpongStore((s) => s.tracker);
  const houseRules = useBeerpongStore((s) => s.houseRules);
  const trackerHit = useBeerpongStore((s) => s.trackerHit);
  const trackerMiss = useBeerpongStore((s) => s.trackerMiss);
  const trackerSwitchTeam = useBeerpongStore((s) => s.trackerSwitchTeam);
  const trackerUndo = useBeerpongStore((s) => s.trackerUndo);
  const trackerSetTeamName = useBeerpongStore((s) => s.trackerSetTeamName);
  const trackerReRack = useBeerpongStore((s) => s.trackerReRack);
  const trackerNewGame = useBeerpongStore((s) => s.trackerNewGame);
  const trackDaily = useBeerpongStore((s) => s.trackDaily);
  const statsRecordMatch = useBeerpongStore((s) => s.statsRecordMatch);

  const feedback = useFeedback();
  const t = useT();
  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);

  const finished = tracker.winner != null;

  /**
   * A finished real game goes into the record too, so form covers the table as
   * well as the arcade.
   *
   * Keyed on when it finished rather than on `finished`, so a rematch writes a
   * second record and a re-render does not write a duplicate. Positions are not
   * recorded here: the heatmap is about where *your* throws land, and at a real
   * table the app only knows a cup went, not who was aiming where.
   */
  const recordedAt = useRef<number | null>(null);
  useEffect(() => {
    const at = tracker.finishedAt;
    if (at == null || recordedAt.current === at) return;
    recordedAt.current = at;
    const winner = tracker.winner;
    if (winner == null) return;
    statsRecordMatch({
      at,
      mode: 'tracker',
      won: winner === 0,
      cupsHit: tracker.teams[0].hits,
      throws: tracker.teams[0].throws,
      seconds: Math.max(0, Math.round((at - tracker.startedAt) / 1000)),
    });
  }, [tracker.finishedAt, tracker.winner, tracker.teams, tracker.startedAt, statsRecordMatch]);
  const shooter = tracker.teams[tracker.activeTeam];
  const targetIndex: TeamIndex = tracker.activeTeam === 0 ? 1 : 0;
  const target = tracker.teams[targetIndex];

  const handleHit = (event: GestureResponderEvent) => {
    if (finished) return;
    const { locationX, locationY } = event.nativeEvent;
    trackerHit();
    trackDaily('trackerCups');
    feedback.cupHit();
    flashRef.current?.flash(colors.neon, 0.32);
    particleRef.current?.burst(locationX, locationY);
    if ((shooter.streak + 1) % 3 === 0) feedback.streak();
  };

  /**
   * A confirmed detection scores against the rack the camera was pointed at.
   *
   * `trackerHit` always credits whoever is active, so the turn has to agree
   * with the rack first — a cup going down on Team 2's rack means Team 1 threw
   * it, whatever the app currently believes about whose turn it is.
   */
  const handleDetectedHit = (againstTeam: TeamIndex) => {
    if (finished) return;
    const scorer: TeamIndex = againstTeam === 0 ? 1 : 0;
    if (tracker.activeTeam !== scorer) trackerSwitchTeam();
    trackerHit();
    trackDaily('trackerCups');
    feedback.cupHit();
    flashRef.current?.flash(colors.neon, 0.32);
    // Read back rather than reusing the render's copy, which predates the
    // switch above.
    const streak = useBeerpongStore.getState().tracker.teams[scorer].streak;
    if (streak > 0 && streak % 3 === 0) feedback.streak();
  };

  const handleMiss = () => {
    if (finished) return;
    trackerMiss();
    feedback.miss();
  };

  const selectTeam = (team: TeamIndex) => {
    if (finished || team === tracker.activeTeam) return;
    feedback.tap();
    trackerSwitchTeam();
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <GridBackground />
        <SafeAreaView style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera" size={40} color={colors.neon} />
          </View>
          <Text style={styles.permissionTitle}>{t('tracker.permission.title')}</Text>
          <Text style={styles.permissionBody}>{t('tracker.permission.body')}</Text>
          <GlowButton
            label={t('tracker.permission.cta')}
            onPress={requestPermission}
            size="lg"
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleHit} />
      <ParticleBurst ref={particleRef} />
      <FlashOverlay ref={flashRef} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <ScreenHeader
          title={t('tracker.title')}
          subtitle={
            finished
              ? t('tracker.finished')
              : t('tracker.throwingAt', { shooter: shooter.name, target: target.name })
          }
          right={
            <>
            {/* Playing against another table is free: a game is a few dozen
                messages, so the room costs nothing to run. */}
            <Pressable
              onPress={() => router.push('/(tabs)/camera/online')}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('tracker.openOnline')}
            >
              <Ionicons name="globe" size={17} color={colors.neon} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/camera/tournament')}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('tracker.openTournament')}
            >
              <Ionicons name="git-network" size={17} color={colors.neon} />
            </Pressable>
            <Pressable
              onPress={() => setDetectVisible((visible) => !visible)}
              style={[styles.iconButton, detectVisible && styles.iconButtonActive]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('detect.button')}
            >
              <Ionicons
                name="scan"
                size={17}
                color={detectVisible ? colors.background : colors.neon}
              />
            </Pressable>
            <Pressable
              onPress={() => setRulesVisible(true)}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('tracker.openHouseRules')}
            >
              <Ionicons name="options" size={18} color={colors.neon} />
            </Pressable>
            </>
          }
        />

        <View style={styles.scoreboardWrap} pointerEvents="box-none">
          <TeamScoreboard
            teams={tracker.teams}
            activeTeam={tracker.activeTeam}
            startCups={tracker.startCups}
            onSelectTeam={selectTeam}
            onRenameTeam={trackerSetTeamName}
          />
        </View>

        {!finished ? (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint} selectable={false}>
              {t('tracker.tapHint', { shooter: shooter.name })}
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <View style={styles.bottomRow}>
            <SmallButton
              icon="close-circle"
              label={t('tracker.miss')}
              onPress={handleMiss}
              disabled={finished}
            />
            <SmallButton
              icon="swap-horizontal"
              label={t('tracker.team')}
              onPress={() => selectTeam(targetIndex)}
              disabled={finished}
            />
            <SmallButton
              icon="arrow-undo"
              label={t('common.back')}
              onPress={() => {
                feedback.tap();
                trackerUndo();
              }}
              disabled={tracker.history.length === 0}
            />
            {houseRules.reRacks ? (
              <SmallButton
                icon="grid"
                label={t('match.reRack', { left: target.reRacksLeft })}
                onPress={() => {
                  feedback.tap();
                  trackerReRack(targetIndex);
                }}
                disabled={finished || target.reRacksLeft === 0}
              />
            ) : null}
          </View>

          <GlowButton
            label={t('tracker.newGame')}
            variant="outline"
            size="sm"
            onPress={() => trackerNewGame()}
            style={styles.newGameButton}
          />
        </View>
      </SafeAreaView>

      {finished ? (
        <View style={styles.resultOverlay}>
          <Confetti />
          <View style={styles.resultCard}>
            <Ionicons name="trophy" size={40} color={colors.gold} />
            <Text style={styles.resultTitle} selectable={false}>
              {t('match.teamWins', { team: tracker.teams[tracker.winner as TeamIndex].name })}
            </Text>
            <View style={styles.resultStats}>
              {tracker.teams.map((team, i) => (
                <View key={i} style={styles.resultTeam}>
                  <Text style={styles.resultTeamName} selectable={false}>
                    {team.name}
                  </Text>
                  <Text style={styles.resultTeamValue} selectable={false}>
                    {team.hits}
                  </Text>
                  <Text style={styles.resultTeamMeta} selectable={false}>
                    {t('tracker.hitsPercent', {
                      percent: team.throws > 0 ? Math.round((team.hits / team.throws) * 100) : 0,
                    })}
                  </Text>
                  <Text style={styles.resultTeamMeta} selectable={false}>
                    {t('tracker.bestStreak', { value: team.bestStreak })}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.resultButtons}>
              <GlowButton
                label={t('tracker.rematch')}
                size="sm"
                onPress={() => trackerNewGame()}
                style={styles.resultButton}
              />
              <ShareResultButton
                data={{
                  headline: t('match.teamWins', {
                    team: tracker.teams[tracker.winner as TeamIndex].name,
                  }),
                  subline: `${tracker.teams[0].name} vs. ${tracker.teams[1].name}`,
                  leftLabel: tracker.teams[0].name,
                  leftValue: `${tracker.startCups - tracker.teams[1].cupsLeft}`,
                  rightLabel: tracker.teams[1].name,
                  rightValue: `${tracker.startCups - tracker.teams[0].cupsLeft}`,
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {detectVisible && !finished ? (
        <AutoDetect
          cupCount={tracker.startCups}
          teamNames={[tracker.teams[0].name, tracker.teams[1].name]}
          onConfirmHit={handleDetectedHit}
          onClose={() => setDetectVisible(false)}
        />
      ) : null}

      <HouseRulesPanel visible={rulesVisible} onClose={() => setRulesVisible(false)} />
    </View>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.smallButton,
        disabled && styles.smallButtonDisabled,
        pressed && !disabled && styles.smallButtonPressed,
      ]}
    >
      <Ionicons name={icon} size={17} color={disabled ? colors.textMuted : colors.neon} />
      <Text
        style={[styles.smallButtonText, disabled && { color: colors.textMuted }]}
        selectable={false}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scoreboardWrap: {
    marginTop: spacing.md,
  },
  hintWrap: {
    alignItems: 'center',
  },
  hint: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  smallButton: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10,10,10,0.75)',
  },
  smallButtonDisabled: {
    borderColor: colors.borderFaint,
  },
  smallButtonPressed: {
    opacity: 0.6,
  },
  smallButtonText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.neon,
    letterSpacing: 0.4,
  },
  newGameButton: {
    alignSelf: 'center',
    minWidth: 160,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  iconButtonPro: {
    borderColor: colors.gold,
  },
  iconButtonActive: {
    backgroundColor: colors.neon,
    borderColor: colors.neon,
  },
  iconLock: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  permissionTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 24,
    color: colors.textPrimary,
  },
  permissionBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  resultCard: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 24,
    color: colors.neon,
    textAlign: 'center',
  },
  resultStats: {
    flexDirection: 'row',
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resultTeam: {
    flex: 1,
    alignItems: 'center',
  },
  resultTeamName: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultTeamValue: {
    fontFamily: fonts.numeric,
    fontSize: 30,
    color: colors.textPrimary,
  },
  resultTeamMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  resultButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  resultButton: {
    width: '100%',
  },
});
