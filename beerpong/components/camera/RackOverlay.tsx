import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { rackLayout } from '@/lib/cupVision';
import { colors, fonts } from '@/theme';

export interface RackFrame {
  /** Centre of the rack, in fractions of the preview. */
  x: number;
  y: number;
  /** Width of the rack, as a fraction of the preview width. */
  width: number;
  /** Height, as a fraction of the preview height. */
  height: number;
}

export const DEFAULT_FRAME: RackFrame = { x: 0.5, y: 0.52, width: 0.62, height: 0.34 };

/** Radius of a cup's sample patch, as a fraction of the preview width. */
export function cupRadius(frame: RackFrame, cupCount: number): number {
  const columns = Math.max(2, Math.ceil(Math.sqrt(2 * cupCount)));
  return Math.max(0.02, (frame.width / columns) * 0.34);
}

/** Where each cup's patch sits in the preview, given the aligned frame. */
export function cupRegions(frame: RackFrame, cupCount: number) {
  const radius = cupRadius(frame, cupCount);
  return rackLayout(cupCount).map((point) => ({
    x: frame.x + (point.x - 0.5) * frame.width,
    y: frame.y + (point.y - 0.5) * frame.height,
    radius,
  }));
}

interface RackOverlayProps {
  frame: RackFrame;
  cupCount: number;
  /** Preview size in pixels, so fractions can be drawn. */
  size: { width: number; height: number };
  /** Cups already scored are drawn faint and are no longer watched. */
  watching: boolean[];
  /** 0-1 per cup, from the detector. Only shown while calibrating. */
  distances?: number[];
  mode: 'aligning' | 'watching';
  /** Highlighted while the user answers a proposal. */
  highlightIndex?: number | null;
}

/**
 * The ring guide the user lays over the real rack.
 *
 * There is no cup detection in this stage — the alignment *is* the
 * calibration. Once the rings sit on the cups, the app knows where to look,
 * which is the whole thing a detector would otherwise have to work out.
 */
export function RackOverlay({
  frame,
  cupCount,
  size,
  watching,
  distances,
  mode,
  highlightIndex,
}: RackOverlayProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (mode !== 'aligning') {
      pulse.value = withTiming(0, { duration: 200 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [mode, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
  }));

  const regions = cupRegions(frame, cupCount);
  const radiusPx = cupRadius(frame, cupCount) * size.width;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {regions.map((region, index) => {
        const scored = !watching[index];
        const active = highlightIndex === index;
        const changed = (distances?.[index] ?? 0) > 26;
        const colour = scored
          ? colors.textMuted
          : active
            ? colors.gold
            : changed
              ? colors.gold
              : colors.neon;

        return (
          <Animated.View
            key={index}
            style={[
              styles.cup,
              {
                left: region.x * size.width - radiusPx,
                top: region.y * size.height - radiusPx,
                width: radiusPx * 2,
                height: radiusPx * 2,
                borderRadius: radiusPx,
                borderColor: colour,
                borderWidth: active ? 3 : scored ? 1 : 2,
                opacity: scored ? 0.28 : 1,
              },
              mode === 'aligning' && pulseStyle,
            ]}
          />
        );
      })}

      {mode === 'aligning' ? (
        <View
          style={[
            styles.bounds,
            {
              left: (frame.x - frame.width / 2) * size.width,
              top: (frame.y - frame.height / 2) * size.height,
              width: frame.width * size.width,
              height: frame.height * size.height,
            },
          ]}
        >
          <Text style={styles.boundsLabel} selectable={false}>
            {cupCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cup: {
    position: 'absolute',
  },
  bounds: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderFaint,
    borderRadius: 8,
  },
  boundsLabel: {
    position: 'absolute',
    top: -18,
    left: 0,
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
  },
});
