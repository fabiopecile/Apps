import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { Confetti } from '@/components/ui/Confetti';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { AutoDetect } from '@/components/camera/AutoDetect';
import { useOnlineRoom } from '@/lib/onlineRoom';
import { makeRoomCode, normaliseRoomCode, otherSeat, type Seat } from '@/lib/onlineProtocol';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * One side of an online match.
 *
 * The phone films its own rack and reports its own losses; everything shown
 * here comes back from the room. That is why there is no local score to fix
 * when the signal drops: there was never one to begin with.
 */
export default function OnlineRoomScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    seat?: string;
    create?: string;
    name?: string;
    cups?: string;
  }>();

  const code = normaliseRoomCode(params.code ?? '');
  const seat: Seat = params.seat === '1' ? 1 : 0;
  const create = params.create === '1';
  const cups = Number(params.cups ?? '10');

  const t = useT();
  const feedback = useFeedback();
  const trackDaily = useBeerpongStore((s) => s.trackDaily);
  const [permission, requestPermission] = useCameraPermissions();
  const [detectVisible, setDetectVisible] = useState(false);
  const flashRef = useRef<FlashOverlayHandle>(null);

  const room = useOnlineRoom(code ? { code, seat, create, name: params.name ?? '', cups } : null);
  const match = room.match;
  const mine = match?.teams[seat] ?? null;
  const theirs = match?.teams[otherSeat(seat)] ?? null;
  const finished = match?.winner != null;
  const iWon = match?.winner === seat;
  const myTurn = match?.activeTeam === seat;

  // A cup going down on our rack is a hit for *them*, so the celebration
  // belongs on their phone. Here it gets a flash, because a report that leaves
  // no mark is a report people press twice.
  const reportCupDown = () => {
    if (finished) return;
    feedback.miss();
    flashRef.current?.flash(colors.gold, 0.3);
    room.send({ type: 'cupDown' });
  };

  const reportMiss = () => {
    if (finished) return;
    feedback.tap();
    room.send({ type: 'miss' });
  };

  /**
   * Our own hits arrive from the other phone, because they are the ones who
   * can see them. So the celebration hangs off the score coming back rather
   * than off anything tapped here — which also means it fires at the moment
   * the other side confirms it, not the moment somebody claims it.
   */
  const myHitsRef = useRef<number | null>(null);
  useEffect(() => {
    const hits = mine?.hits;
    if (hits == null) return;
    const before = myHitsRef.current;
    myHitsRef.current = hits;
    if (before == null || hits <= before) return;
    trackDaily('trackerCups', hits - before);
    feedback.cupHit();
    flashRef.current?.flash(colors.neon, 0.32);
  }, [mine?.hits, feedback, trackDaily]);

  const openCamera = async () => {
    feedback.tap();
    if (!permission?.granted) {
      const granted = await requestPermission();
      if (!granted.granted) return;
    }
    setDetectVisible(true);
  };

  const shareCode = async () => {
    feedback.tap();
    try {
      await Share.share({ message: t('online.codeTitle') + ': ' + code });
    } catch {
      // Not every platform has a share sheet; the code is on screen anyway.
    }
  };

  if (room.status === 'off' || !code) {
    // Reached by a stale link rather than by the lobby, which checks first.
    return (
      <View style={styles.container}>
        <GridBackground />
        <SafeAreaView style={styles.centre}>
          <Text style={styles.bigTitle}>{t('online.notSetUpTitle')}</Text>
          <Text style={styles.centreBody}>{t('online.notSetUpBody')}</Text>
          <GlowButton label={t('common.back')} size="sm" onPress={() => router.back()} />
        </SafeAreaView>
      </View>
    );
  }

  if (room.status === 'refused') {
    const reason = room.refusal ?? 'badCode';
    return (
      <View style={styles.container}>
        <GridBackground />
        <SafeAreaView style={styles.centre}>
          <Ionicons name="alert-circle" size={34} color={colors.gold} />
          <Text style={styles.bigTitle}>{t(`online.refused.${reason}` as const)}</Text>
          {reason === 'taken' && create ? (
            // Two rooms happened to pick the same four characters. Another go
            // is all it takes, so do not send anybody back to the lobby for it.
            <GlowButton
              label={t('online.tryAgain')}
              size="sm"
              onPress={() =>
                router.replace({
                  pathname: '/(tabs)/camera/room',
                  params: { ...params, code: makeRoomCode() },
                })
              }
            />
          ) : null}
          <GlowButton
            label={t('common.back')}
            size="sm"
            variant="ghost"
            onPress={() => router.back()}
          />
        </SafeAreaView>
      </View>
    );
  }

  const peerHere = room.present[otherSeat(seat)];

  return (
    <View style={styles.container}>
      {permission?.granted && detectVisible ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <GridBackground />
      )}
      {permission?.granted && detectVisible ? (
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <FlashOverlay ref={flashRef} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={shareCode} style={styles.codeChip}>
            <Text style={styles.codeText} selectable={false}>
              {code}
            </Text>
            <Ionicons name="share-outline" size={15} color={colors.neon} />
          </Pressable>
          <View style={[styles.presenceDot, peerHere ? styles.presenceOn : styles.presenceOff]} />
        </View>

        <View style={styles.scoreRow}>
          <RackScore
            label={t('online.yourRack')}
            name={mine?.name ?? '—'}
            left={mine?.cupsLeft ?? 0}
            total={match?.startCups ?? 10}
            active={myTurn}
          />
          <RackScore
            label={t('online.theirRack')}
            name={theirs?.name ?? '—'}
            left={theirs?.cupsLeft ?? 0}
            total={match?.startCups ?? 10}
            active={!myTurn}
          />
        </View>

        <View style={styles.statusWrap} pointerEvents="none">
          <Text style={styles.status} selectable={false}>
            {room.status !== 'open'
              ? room.status === 'connecting'
                ? t('online.connecting')
                : t('online.reconnecting')
              : !peerHere
                ? match && (match.teams[0].throws > 0 || match.teams[1].throws > 0)
                  ? t('online.otherLeft')
                  : t('online.waitingForOther')
                : myTurn
                  ? t('online.yourTurn')
                  : t('online.theirTurn')}
          </Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.reportTitle} selectable={false}>
            {t('online.reportTitle')}
          </Text>
          <View style={styles.reportRow}>
            <GlowButton
              label={t('online.cupDown')}
              size="sm"
              onPress={reportCupDown}
              disabled={finished || room.status !== 'open'}
              style={styles.reportButton}
            />
            <GlowButton
              label={t('online.missed')}
              size="sm"
              variant="outline"
              onPress={reportMiss}
              disabled={finished || room.status !== 'open'}
              style={styles.reportButton}
            />
          </View>
          <Text style={styles.reportHint} selectable={false}>
            {t('online.reportHint')}
          </Text>

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => {
                feedback.tap();
                room.send({ type: 'undo' });
              }}
              style={styles.linkButton}
            >
              <Ionicons name="arrow-undo" size={14} color={colors.neon} />
              <Text style={styles.link} selectable={false}>
                {t('common.back')}
              </Text>
            </Pressable>
            <Pressable
              onPress={detectVisible ? () => setDetectVisible(false) : openCamera}
              style={styles.linkButton}
            >
              <Ionicons name="scan-outline" size={14} color={colors.neon} />
              <Text style={styles.link} selectable={false}>
                {detectVisible ? t('detect.stop') : t('detect.button')}
              </Text>
            </Pressable>
          </View>
          {!detectVisible ? (
            <Text style={styles.reportHint} selectable={false}>
              {t('online.cameraHint')}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>

      {detectVisible && !finished && permission?.granted ? (
        <AutoDetect
          singleRack
          cupCount={match?.startCups ?? 10}
          teamNames={[mine?.name ?? '', theirs?.name ?? '']}
          // Single rack, so the only rack it can report is ours.
          onConfirmHit={reportCupDown}
          onClose={() => setDetectVisible(false)}
        />
      ) : null}

      {finished ? (
        <View style={styles.resultOverlay}>
          {iWon ? <Confetti /> : null}
          <View style={styles.resultCard}>
            <Ionicons name={iWon ? 'trophy' : 'sad-outline'} size={38} color={colors.gold} />
            <Text style={styles.resultTitle} selectable={false}>
              {iWon ? t('online.youWon') : t('online.theyWon')}
            </Text>
            <Text style={styles.resultLine} selectable={false}>
              {`${mine?.name ?? ''} ${mine?.hits ?? 0} : ${theirs?.hits ?? 0} ${theirs?.name ?? ''}`}
            </Text>
            <GlowButton
              label={t('online.rematch')}
              size="sm"
              onPress={() => {
                feedback.tap();
                room.send({ type: 'rematch' });
              }}
            />
            <GlowButton
              label={t('online.leave')}
              size="sm"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function RackScore({
  label,
  name,
  left,
  total,
  active,
}: {
  label: string;
  name: string;
  left: number;
  total: number;
  active: boolean;
}) {
  return (
    <View style={[styles.rack, active && styles.rackActive]}>
      <Text style={styles.rackLabel} selectable={false}>
        {label}
      </Text>
      <Text style={styles.rackName} numberOfLines={1} selectable={false}>
        {name}
      </Text>
      <Text style={styles.rackValue} selectable={false}>
        {left}
        <Text style={styles.rackTotal}>{` / ${total}`}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  bigTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  centreBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.neon,
    backgroundColor: 'rgba(10,10,10,0.8)',
  },
  codeText: {
    fontFamily: fonts.numeric,
    fontSize: 20,
    letterSpacing: 5,
    color: colors.neon,
  },
  presenceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  presenceOn: { backgroundColor: colors.neon, ...glow('soft') },
  presenceOff: { backgroundColor: colors.textMuted },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  rack: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: 'rgba(10,10,10,0.78)',
    gap: 2,
  },
  rackActive: {
    borderColor: colors.neon,
    ...glow('soft'),
  },
  rackLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  rackName: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rackValue: {
    fontFamily: fonts.numeric,
    fontSize: 30,
    color: colors.textPrimary,
  },
  rackTotal: {
    fontFamily: fonts.numeric,
    fontSize: 15,
    color: colors.textMuted,
  },
  statusWrap: { alignItems: 'center' },
  status: {
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  reportTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  reportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reportButton: { flex: 1 },
  reportHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  link: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
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
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  resultTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 24,
    color: colors.neon,
    textAlign: 'center',
  },
  resultLine: {
    fontFamily: fonts.numeric,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
