import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { GlowButton } from '@/components/ui/GlowButton';
import { RackOverlay, cupRegions, defaultFrames, type RackFrame } from './RackOverlay';
import {
  acceptCup,
  calibrate,
  createDetector,
  rejectCup,
  step,
  type DetectorState,
} from '@/lib/cupVision';
import { createFrameSampler, FRAME_SAMPLING_SUPPORTED, type FrameSampler } from '@/lib/frameSampler';
import { useT } from '@/lib/i18n';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/** Roughly five looks per second — the racks are not going anywhere. */
const SAMPLE_INTERVAL_MS = 180;

type TeamIndex = 0 | 1;
type Mode = 'aligning' | 'watching';

interface AutoDetectProps {
  cupCount: number;
  teamNames: [string, string];
  /** Confirmed hit, against the team whose rack lost the cup. */
  onConfirmHit: (againstTeam: TeamIndex) => void;
  onClose: () => void;
}

/**
 * Stage one of the camera feature: the app watches the racks and asks, the
 * person decides.
 *
 * Both ends of the table can be watched at once, which is what makes the
 * scoring unambiguous — a cup going down on Team 1's rack means Team 2 threw
 * it, no matter what the app believes about whose turn it is. Only one rack in
 * frame still works; the second is skippable.
 *
 * Alignment is the calibration. Once the rings sit over the real cups the app
 * knows where to look, which is the part a trained model would otherwise have
 * to work out; the rest is noticing that a patch stopped looking like a cup,
 * and that is `lib/cupVision.ts`.
 */
export function AutoDetect({ cupCount, teamNames, onConfirmHit, onClose }: AutoDetectProps) {
  // Measured rather than taken from the window: the preview sits above the
  // tab bar, so the window is taller than the video. Sharing one box is what
  // keeps the rings and the sampled patches over the same cups.
  const [size, setSize] = useState({ width: 1, height: 1 });
  const landscape = size.width > size.height;
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0) setSize({ width: w, height: h });
  };
  const t = useT();
  const feedback = useFeedback();

  const [mode, setMode] = useState<Mode>('aligning');
  /** Which rack is being lined up: 0 first, then 1. */
  const [aligning, setAligning] = useState<TeamIndex>(0);
  const [frames, setFrames] = useState<[RackFrame, RackFrame]>(() => defaultFrames(false));
  /** Reset the guides when the phone is turned — the old ones make no sense. */
  const wasLandscape = useRef<boolean | null>(null);
  /** Teams whose racks ended up being watched, in sampling order. */
  const [racks, setRacks] = useState<TeamIndex[]>([0, 1]);
  const [detector, setDetector] = useState<DetectorState>(() => createDetector([cupCount]));
  const [pending, setPending] = useState<number | null>(null);
  const [distances, setDistances] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const samplerRef = useRef<FrameSampler | null>(null);
  const detectorRef = useRef(detector);
  const pendingRef = useRef<number | null>(null);
  const framesRef = useRef(frames);
  const racksRef = useRef(racks);
  const sizeRef = useRef(size);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  detectorRef.current = detector;
  pendingRef.current = pending;
  framesRef.current = frames;
  racksRef.current = racks;
  sizeRef.current = size;

  useEffect(() => {
    if (wasLandscape.current === landscape) return;
    const first = wasLandscape.current === null;
    wasLandscape.current = landscape;
    // On the very first layout this just picks the right starting point; on a
    // later turn it throws away guides that no longer point at anything.
    setFrames(defaultFrames(landscape));
    if (!first) {
      setMode('aligning');
      setAligning(0);
    }
  }, [landscape]);

  useEffect(() => {
    samplerRef.current = createFrameSampler();
    return () => {
      samplerRef.current?.dispose();
      samplerRef.current = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2800);
  }, []);

  /** Every watched rack's patches, laid end to end in `racks` order. */
  const readFrame = useCallback(
    (forRacks: TeamIndex[]) => {
      const sampler = samplerRef.current;
      if (!sampler) return null;
      const aspect = sizeRef.current.width / Math.max(1, sizeRef.current.height);
      const regions = forRacks.flatMap((team) =>
        cupRegions(framesRef.current[team], cupCount, aspect)
      );
      return sampler.sample(regions);
    },
    [cupCount]
  );

  /** Locks in what full racks look like and starts watching. */
  const startWatching = useCallback(
    (forRacks: TeamIndex[]) => {
      const samples = readFrame(forRacks);
      if (!samples) {
        flash(t('detect.noFrame'));
        return;
      }
      feedback.tap();
      setRacks(forRacks);
      racksRef.current = forRacks;
      setDetector(calibrate(createDetector(forRacks.map(() => cupCount)), samples));
      setMode('watching');
    },
    [cupCount, feedback, flash, readFrame, t]
  );

  // The watch loop. Deliberately an interval rather than a render loop: five
  // samples a second is plenty, and it keeps the phone cool.
  useEffect(() => {
    if (mode !== 'watching') return;

    const tick = () => {
      // While a question is on screen, stop looking — otherwise the same cup
      // would queue up behind itself.
      if (pendingRef.current != null) return;

      const samples = readFrame(racksRef.current);
      if (!samples) return;

      const result = step(detectorRef.current, samples);
      setDistances(result.distances);
      setDetector(result.state);

      for (const event of result.events) {
        if (event.type === 'cupGone') {
          feedback.streak();
          setPending(event.index);
          break;
        }
        if (event.type === 'disturbed') {
          flash(t('detect.disturbed', { team: teamNames[racksRef.current[event.rack]] }));
          break;
        }
        if (event.type === 'rebaselined') {
          // The view changed for good — the phone was moved, or the lights
          // went. Worth saying out loud rather than quietly carrying on:
          // anything that went down while it was confused was not counted, and
          // only the player can put that right.
          flash(t('detect.rebaselined', { team: teamNames[racksRef.current[event.rack]] }));
          break;
        }
      }
    };

    const id = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, readFrame, feedback, flash, t, teamNames]);

  /** Sampling order maps straight back to the team that lost the cup. */
  const teamForIndex = (index: number): TeamIndex => racks[Math.floor(index / cupCount)];

  const confirm = () => {
    if (pending == null) return;
    const team = teamForIndex(pending);
    setDetector((state) => acceptCup(state, pending));
    setPending(null);
    onConfirmHit(team);
  };

  const dismiss = () => {
    if (pending == null) return;
    feedback.tap();
    setDetector((state) => rejectCup(state, pending));
    setPending(null);
  };

  // Drag, pinch and twist the rack being aligned. Committed to React state as
  // it moves so the sampler and the drawing never disagree about where the
  // rack is; it only runs while aligning.
  const editFrame = (change: (frame: RackFrame) => RackFrame) => {
    setFrames((current) => {
      const next: [RackFrame, RackFrame] = [{ ...current[0] }, { ...current[1] }];
      next[aligning] = change(next[aligning]);
      return next;
    });
  };

  const applyPan = (dx: number, dy: number) =>
    editFrame((frame) => ({
      ...frame,
      x: clamp(frame.x + dx / size.width, 0.05, 0.95),
      y: clamp(frame.y + dy / size.height, 0.05, 0.95),
    }));

  const applyScale = (factor: number) =>
    editFrame((frame) => ({
      ...frame,
      width: clamp(frame.width * factor, 0.12, 0.98),
      height: clamp(frame.height * factor, 0.08, 0.9),
    }));

  const applyRotation = (delta: number) =>
    editFrame((frame) => ({ ...frame, rotation: frame.rotation + delta }));

  const turnQuarter = () => {
    feedback.tap();
    applyRotation(Math.PI / 2);
  };

  const pan = Gesture.Pan()
    .enabled(mode === 'aligning')
    .onChange((event) => {
      runOnJS(applyPan)(event.changeX, event.changeY);
    });

  const pinch = Gesture.Pinch()
    .enabled(mode === 'aligning')
    .onChange((event) => {
      runOnJS(applyScale)(event.scaleChange);
    });

  const rotate = Gesture.Rotation()
    .enabled(mode === 'aligning')
    .onChange((event) => {
      runOnJS(applyRotation)(event.rotationChange);
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate);

  if (!FRAME_SAMPLING_SUPPORTED) {
    return (
      <View style={styles.unsupported}>
        <Ionicons name="phone-portrait-outline" size={26} color={colors.textSecondary} />
        <Text style={styles.unsupportedText}>{t('detect.unsupported')}</Text>
        <GlowButton label={t('common.close')} variant="outline" size="sm" onPress={onClose} />
      </View>
    );
  }

  const watchedRacks = mode === 'aligning' ? ([0, 1] as TeamIndex[]) : racks;
  const overlay = watchedRacks.map((team, position) => {
    const offset = position * cupCount;
    // While aligning, the rack not being touched is drawn dim for context.
    const dim = mode === 'aligning' && team !== aligning;
    return (
      <RackOverlay
        key={team}
        frame={frames[team]}
        cupCount={cupCount}
        size={size}
        watching={
          mode === 'watching'
            ? detector.watching.slice(offset, offset + cupCount)
            : Array(cupCount).fill(true)
        }
        distances={mode === 'watching' ? distances.slice(offset, offset + cupCount) : undefined}
        mode={mode}
        dim={dim}
        highlightIndex={
          pending != null && pending >= offset && pending < offset + cupCount
            ? pending - offset
            : null
        }
      />
    );
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      {mode === 'aligning' ? (
        // Only while aligning does this layer take touches; afterwards it must
        // let taps through, because tapping to score by hand still works.
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            {overlay}
          </View>
        </GestureDetector>
      ) : (
        overlay
      )}

      {/* While a question is on screen, swallow stray taps — otherwise the
          same cup gets counted twice: once by the prompt, once by hand. */}
      {pending != null ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
      ) : null}

      {notice ? (
        <View style={styles.notice} pointerEvents="none">
          <Text style={styles.noticeText} selectable={false}>
            {notice}
          </Text>
        </View>
      ) : null}

      <View style={[styles.panel, landscape && styles.panelLandscape]}>
        {mode === 'aligning' ? (
          <>
            <View style={styles.stepRow}>
              <Text style={styles.title}>
                {t('detect.alignStep', { step: aligning + 1, team: teamNames[aligning] })}
              </Text>
              <Pressable onPress={turnQuarter} style={styles.turnButton} hitSlop={6}>
                <Ionicons name="refresh" size={14} color={colors.neon} />
                <Text style={styles.turnText} selectable={false}>
                  90°
                </Text>
              </Pressable>
            </View>
            {landscape ? null : <Text style={styles.body}>{t('detect.alignBody')}</Text>}
            {!landscape ? (
              <View style={styles.tipRow}>
                <Ionicons name="phone-landscape-outline" size={14} color={colors.gold} />
                <Text style={styles.tip} selectable={false}>
                  {t('detect.turnTip')}
                </Text>
              </View>
            ) : null}
            <View style={styles.row}>
              {aligning === 0 ? (
                <>
                  <GlowButton
                    label={t('common.cancel')}
                    variant="ghost"
                    size="sm"
                    onPress={onClose}
                    style={styles.flexButton}
                  />
                  <GlowButton
                    label={t('detect.nextRack')}
                    size="sm"
                    onPress={() => {
                      feedback.tap();
                      setAligning(1);
                    }}
                    style={styles.flexButton}
                  />
                </>
              ) : (
                <>
                  <GlowButton
                    label={t('detect.onlyOne')}
                    variant="ghost"
                    size="sm"
                    onPress={() => startWatching([0])}
                    style={styles.flexButton}
                  />
                  <GlowButton
                    label={t('detect.start')}
                    size="sm"
                    onPress={() => startWatching([0, 1])}
                    style={styles.flexButton}
                  />
                </>
              )}
            </View>
          </>
        ) : pending != null ? (
          <>
            <Text style={styles.title}>{t('detect.hitTitle')}</Text>
            <Text style={styles.body} numberOfLines={landscape ? 1 : 2}>
              {t('detect.hitBody', {
                loser: teamNames[teamForIndex(pending)],
                scorer: teamNames[teamForIndex(pending) === 0 ? 1 : 0],
              })}
            </Text>
            <View style={styles.row}>
              <GlowButton
                label={t('detect.notAHit')}
                variant="outline"
                size="sm"
                onPress={dismiss}
                style={styles.flexButton}
              />
              <GlowButton
                label={t('detect.wasAHit')}
                size="sm"
                onPress={confirm}
                style={styles.flexButton}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.status} selectable={false}>
                {t(racks.length > 1 ? 'detect.watchingBoth' : 'detect.watchingOne', {
                  left: detector.watching.filter(Boolean).length,
                })}
              </Text>
            </View>
            <View style={styles.row}>
              <Pressable
                onPress={() => {
                  setAligning(0);
                  setMode('aligning');
                }}
                style={styles.linkButton}
              >
                <Ionicons name="scan-outline" size={14} color={colors.neon} />
                <Text style={styles.link} selectable={false}>
                  {t('detect.recalibrate')}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.linkButton}>
                <Ionicons name="close" size={14} color={colors.textSecondary} />
                <Text style={[styles.link, { color: colors.textSecondary }]} selectable={false}>
                  {t('detect.stop')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.neon,
    backgroundColor: 'rgba(10,10,10,0.92)',
    gap: spacing.sm,
    ...glow('soft'),
  },
  /**
   * Sideways there is barely any height to spare, and a full-width panel
   * buries the very racks the user is trying to line up. It shrinks to a bar
   * across the bottom and drops the explanatory text.
   */
  panelLandscape: {
    paddingVertical: spacing.sm,
    gap: 6,
    bottom: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.headingBlack,
    fontSize: 17,
    color: colors.textPrimary,
  },
  turnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.neon,
  },
  turnText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flexButton: { flex: 1 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tip: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.gold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neon,
  },
  status: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textPrimary,
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
  notice: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  noticeText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.gold,
    textAlign: 'center',
  },
  unsupported: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10,10,10,0.94)',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unsupportedText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
