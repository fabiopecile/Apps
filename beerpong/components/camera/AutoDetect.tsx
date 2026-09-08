import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { GlowButton } from '@/components/ui/GlowButton';
import { RackOverlay, cupRegions, DEFAULT_FRAME, type RackFrame } from './RackOverlay';
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

/** Roughly five looks per second — the rack is not going anywhere. */
const SAMPLE_INTERVAL_MS = 180;

type Mode = 'aligning' | 'watching';

interface AutoDetectProps {
  cupCount: number;
  teamNames: [string, string];
  /** Whose rack the camera is presumed to be pointing at when it opens. */
  defaultTeam: 0 | 1;
  /** Confirmed hit, against the team whose rack was actually watched. */
  onConfirmHit: (againstTeam: 0 | 1) => void;
  onClose: () => void;
}

/**
 * Stage one of the camera feature: the app watches the rack and asks, the
 * person decides.
 *
 * Alignment is the calibration — once the rings sit over the real cups, the
 * app knows where to look, which is the part a trained model would otherwise
 * have to work out. What is left is noticing that a patch stopped looking
 * like a cup, and that is what `lib/cupVision.ts` does.
 */
export function AutoDetect({
  cupCount,
  teamNames,
  defaultTeam,
  onConfirmHit,
  onClose,
}: AutoDetectProps) {
  // Measured rather than taken from the window: the preview sits above the
  // tab bar, so the window is taller than the video. Sharing one box is what
  // keeps the rings and the sampled patches over the same cups.
  const [size, setSize] = useState({ width: 1, height: 1 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0) setSize({ width: w, height: h });
  };
  const t = useT();
  const feedback = useFeedback();

  const [mode, setMode] = useState<Mode>('aligning');
  // Which rack the rings were placed on. Locked in at calibration and kept:
  // whose turn it is changes constantly, the physical rack in frame does not,
  // and only the rack can say who just lost a cup.
  const [watchedTeam, setWatchedTeam] = useState<0 | 1>(defaultTeam);
  const [frame, setFrame] = useState<RackFrame>(DEFAULT_FRAME);
  const [detector, setDetector] = useState<DetectorState>(() => createDetector(cupCount));
  const [pickedTeam, setPickedTeam] = useState<0 | 1>(defaultTeam);
  const [pending, setPending] = useState<number | null>(null);
  const [distances, setDistances] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const samplerRef = useRef<FrameSampler | null>(null);
  const detectorRef = useRef(detector);
  const pendingRef = useRef<number | null>(null);
  const frameRef = useRef(frame);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  detectorRef.current = detector;
  pendingRef.current = pending;
  frameRef.current = frame;

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
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  const readFrame = useCallback(() => {
    const sampler = samplerRef.current;
    if (!sampler) return null;
    return sampler.sample(cupRegions(frameRef.current, cupCount));
  }, [cupCount]);

  /** Locks in what a full rack looks like and starts watching. */
  const startWatching = useCallback(() => {
    const samples = readFrame();
    if (!samples) {
      flash(t('detect.noFrame'));
      return;
    }
    feedback.tap();
    setDetector(calibrate(createDetector(cupCount), samples));
    setWatchedTeam(pickedTeam);
    setMode('watching');
  }, [cupCount, feedback, flash, pickedTeam, readFrame, t]);

  // The watch loop. Deliberately an interval rather than a render loop: five
  // samples a second is plenty, and it keeps the phone cool.
  useEffect(() => {
    if (mode !== 'watching') return;

    const tick = () => {
      // While a question is on screen, stop looking — otherwise the same cup
      // would queue up behind itself.
      if (pendingRef.current != null) return;

      const samples = readFrame();
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
          flash(t('detect.disturbed'));
          break;
        }
      }
    };

    const id = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, readFrame, feedback, flash, t]);

  const confirm = () => {
    if (pending == null) return;
    setDetector((state) => acceptCup(state, pending));
    setPending(null);
    onConfirmHit(watchedTeam);
  };

  const dismiss = () => {
    if (pending == null) return;
    feedback.tap();
    setDetector((state) => rejectCup(state, pending));
    setPending(null);
  };

  // Drag to move the guide, pinch to size it. Committed to React state as it
  // moves so the sampler and the drawing never disagree about where the rack
  // is; it only runs while aligning.
  const applyPan = (dx: number, dy: number) => {
    setFrame((current) => ({
      ...current,
      x: clamp(current.x + dx / size.width, 0.1, 0.9),
      y: clamp(current.y + dy / size.height, 0.1, 0.9),
    }));
  };

  const applyScale = (factor: number) => {
    setFrame((current) => ({
      ...current,
      width: clamp(current.width * factor, 0.2, 0.98),
      height: clamp(current.height * factor, 0.12, 0.8),
    }));
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

  const gesture = Gesture.Simultaneous(pan, pinch);

  if (!FRAME_SAMPLING_SUPPORTED) {
    return (
      <View style={styles.unsupported}>
        <Ionicons name="phone-portrait-outline" size={26} color={colors.textSecondary} />
        <Text style={styles.unsupportedText}>{t('detect.unsupported')}</Text>
        <GlowButton label={t('common.close')} variant="outline" size="sm" onPress={onClose} />
      </View>
    );
  }

  const overlay = (
    <RackOverlay
      frame={frame}
      cupCount={cupCount}
      size={size}
      watching={detector.watching}
      distances={distances}
      mode={mode}
      highlightIndex={pending}
    />
  );

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

      <View style={styles.panel}>
        {mode === 'aligning' ? (
          <>
            <Text style={styles.title}>{t('detect.alignTitle')}</Text>
            <Text style={styles.body}>{t('detect.alignBody')}</Text>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel} selectable={false}>
                {t('detect.whichRack')}
              </Text>
              {([0, 1] as const).map((team) => (
                <Pressable
                  key={team}
                  onPress={() => setPickedTeam(team)}
                  style={[styles.teamChip, pickedTeam === team && styles.teamChipActive]}
                >
                  <Text
                    style={[styles.teamText, pickedTeam === team && styles.teamTextActive]}
                    selectable={false}
                    numberOfLines={1}
                  >
                    {teamNames[team]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <GlowButton
                label={t('common.cancel')}
                variant="ghost"
                size="sm"
                onPress={onClose}
                style={styles.flexButton}
              />
              <GlowButton
                label={t('detect.start')}
                size="sm"
                onPress={startWatching}
                style={styles.flexButton}
              />
            </View>
          </>
        ) : pending != null ? (
          <>
            <Text style={styles.title}>{t('detect.hitTitle')}</Text>
            <Text style={styles.body}>
              {t('detect.hitBody', { team: teamNames[watchedTeam] })}
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
                {t('detect.watching', {
                  left: detector.watching.filter(Boolean).length,
                })}
              </Text>
            </View>
            <View style={styles.row}>
              <Pressable onPress={() => setMode('aligning')} style={styles.linkButton}>
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
    bottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.neon,
    backgroundColor: 'rgba(10,10,10,0.92)',
    gap: spacing.sm,
    ...glow('soft'),
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 17,
    color: colors.textPrimary,
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
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  teamChip: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  teamChipActive: {
    borderColor: colors.neon,
    backgroundColor: colors.neonFaint,
  },
  teamText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  teamTextActive: { color: colors.neon },
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
