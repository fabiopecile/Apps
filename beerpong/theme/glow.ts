import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

export function glow(intensity: 'soft' | 'medium' | 'strong' = 'medium', color: string = colors.neon): ViewStyle {
  const map = {
    soft: { radius: 8, opacity: 0.45, elevation: 4 },
    medium: { radius: 16, opacity: 0.65, elevation: 8 },
    strong: { radius: 28, opacity: 0.85, elevation: 14 },
  }[intensity];

  return Platform.select<ViewStyle>({
    web: {
      // react-native-web maps boxShadow directly, giving a truer neon glow.
      boxShadow: `0 0 ${map.radius}px ${map.radius / 2}px ${hexToRgba(color, map.opacity)}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: map.opacity,
      shadowRadius: map.radius,
      elevation: map.elevation,
    },
  }) as ViewStyle;
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
