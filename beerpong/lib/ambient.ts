import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * The motion that never stops.
 *
 * Everything else in the app moves because something happened — a throw landed,
 * a screen was opened, a cup was won. The handful of animations built on this
 * module move because nothing happened: a light drifting across the felt, a
 * rack breathing, a sheen crossing a row. The point is that the app should look
 * like a room with somebody in it rather than a screenshot.
 *
 * That makes it the one kind of animation in the app that can genuinely cost
 * something, so the rules are here rather than repeated five times:
 *
 * **It is slow.** The fastest loop here is five seconds; the slowest is
 * nineteen. Ambient motion that reads as *motion* has failed — the eye should
 * only notice that the screen is not a still image.
 *
 * **It is faint.** None of these effects changes a colour, a position or a size
 * by more than a few percent. This is not where the app is loud; that is the
 * hero card and the celebrations, and those fire on events.
 *
 * **It stops.** Two ways, both handled by `useAmbientEnabled` below: the
 * viewer's own reduce-motion setting turns it off outright, and sending the app
 * to the background stops it too, so a phone in a pocket is not animating a
 * lamp nobody is looking at.
 *
 * One thing it deliberately does *not* do: pause a screen that is mounted but
 * covered by another screen. Expo Router keeps the previous screen alive behind
 * the one on top, so those loops keep running. It is a real if small cost —
 * measured in a couple of timers, not a frame loop per screen — and the hook
 * that would fix it (`useFocusEffect`) throws when a component renders outside
 * a navigator, which these components do in the share-image renderer. Worth
 * revisiting if the profiler ever points here.
 */

/**
 * Cycle lengths, in milliseconds, and the one stagger.
 *
 * Gathered in one place because they were chosen against each other rather than
 * individually: the numbers are deliberately not multiples, so the five effects
 * drift in and out of phase instead of locking into a visible pulse. Changing
 * one to a round multiple of another will make the whole screen throb.
 */
export const AMBIENT = {
  /** The lamp above the felt, swinging. */
  felt: 19000,
  /** A light running once around the hero card. */
  sweep: 7000,
  /** The cup rack, breathing. */
  breath: 5000,
  /** A sheen crossing one list row. */
  glint: 9000,
  /** How far behind its neighbour each row's sheen runs. */
  glintStagger: 280,
  /** The coin counter catching the light. */
  coin: 6500,
} as const;

/**
 * Whether the never-ending animations should be running at all.
 *
 * `useReducedMotion` reads the platform's own accessibility setting — iOS
 * "Reduce Motion", Android "Remove animations", and `prefers-reduced-motion` on
 * web — so a player who has asked their device for stillness gets it without
 * the app inventing a second setting for the same thing.
 */
export function useAmbientEnabled(): boolean {
  const reduced = useReducedMotion();
  // Not `=== 'active'`: iOS reports 'inactive' for the app switcher, an
  // incoming call banner and Control Centre, all of which last a moment and end
  // with the app back in front. Stopping for those would read as a stutter.
  const [awake, setAwake] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAwake(state !== 'background');
    });
    return () => subscription.remove();
  }, []);

  return !reduced && awake;
}

/**
 * A value that cycles from 0 to 1 forever, for as long as ambient motion is on.
 *
 * **0 is the resting pose.** Whatever this drives has to look right at 0,
 * because that is exactly where it sits for somebody with reduce-motion turned
 * on — which is the state a fair number of people use their phone in, and a
 * design that only works mid-animation is broken for them.
 *
 * `reverse` runs the cycle back down instead of snapping, for the effects that
 * breathe; leave it off for the ones that travel in one direction and restart.
 */
export function useAmbientLoop(
  duration: number,
  { delay = 0, reverse = false }: { delay?: number; reverse?: boolean } = {}
): SharedValue<number> {
  const enabled = useAmbientEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          // A breath eases at both ends; a sheen that travels and restarts must
          // be linear, or it visibly slows down just before it vanishes.
          easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear,
        }),
        -1,
        reverse
      )
    );
    return () => cancelAnimation(progress);
  }, [enabled, duration, delay, reverse, progress]);

  return progress;
}
