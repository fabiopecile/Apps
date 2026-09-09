import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface CountUpProps {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  /** Rendered around the number, e.g. ({n}) => `${n} XP`. */
  format?: (value: number) => string;
}

// Rolls a number up to its new value instead of snapping. Uses state rather
// than Animated because Animated can't drive text content directly.
export function CountUp({ value, style, duration = 700, format }: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <Text style={style}>{format ? format(display) : display.toLocaleString('de-DE')}</Text>;
}
