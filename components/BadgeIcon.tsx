import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';
import { colors } from '@/constants/theme';

/**
 * Die Badge-Symbole, selbst gezeichnet.
 *
 * Kein Emoji und keine Icon-Bibliothek: Emojis sehen auf jedem Gerät anders
 * aus - auf Android kommt Notos flaches Set, auf iOS Apples plastisches - und
 * eine Auszeichnung, die je nach Telefon anders aussieht, wirkt nicht wie eine
 * Auszeichnung. Alle Formen hier liegen auf demselben 24er-Raster, tragen
 * dieselbe Strichstärke und nehmen ihre Farbe von außen, damit vergeben und
 * gesperrt derselbe Umriss in zwei Zuständen sind.
 */

export type BadgeIconName =
  | 'flag'
  | 'flame'
  | 'podium'
  | 'bubbles'
  | 'target'
  | 'calendar'
  | 'network'
  | 'chevrons'
  | 'shield';

interface BadgeIconProps {
  name: string;
  size?: number;
  color?: string;
  /** Zweite Farbe für das eine Akzent-Element pro Symbol. */
  accent?: string;
}

export function BadgeIcon({ name, size = 28, color = colors.gold, accent }: BadgeIconProps) {
  const stroke = color;
  const spot = accent ?? color;
  const common = {
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>{shape(name, common, spot)}</G>
    </Svg>
  );
}

function shape(name: string, common: Record<string, unknown>, spot: string) {
  switch (name) {
    // Erster Tipp - die Fahne, die man als Erster steckt.
    case 'flag':
      return (
        <>
          <Line x1={6.5} y1={3.5} x2={6.5} y2={21} {...common} />
          <Path d="M6.5 4.5 L18 8 L6.5 11.5 Z" {...common} fill={spot} fillOpacity={0.22} />
        </>
      );

    // Heiße Serie - eine Flamme aus zwei Bögen, innen ein voller Kern.
    case 'flame':
      return (
        <>
          <Path
            d="M12 2.5c3.2 3.6 5.4 6 5.4 9.4a5.4 5.4 0 0 1-10.8 0c0-2 .9-3.3 2.2-4.8.5 1.2 1.1 1.8 1.8 2 .3-2.4-.1-4.4 1.4-6.6z"
            {...common}
          />
          <Path d="M12 13c1.4 1.5 2 2.4 2 3.4a2 2 0 0 1-4 0c0-1 .6-1.9 2-3.4z" fill={spot} stroke="none" />
        </>
      );

    // Podium - drei Stufen, die mittlere höher und gefüllt. Ein Stern darüber
    // saß bei 30 Pixeln auf der Stufenkante und wurde zum Klecks; die Höhe
    // allein sagt schon, welcher Platz gemeint ist.
    case 'podium':
      return (
        <>
          <Rect x={2.5} y={12} width={5.5} height={8.5} rx={1} {...common} />
          <Rect x={9.25} y={5.5} width={5.5} height={15} rx={1} {...common} fill={spot} fillOpacity={0.24} />
          <Rect x={16} y={15} width={5.5} height={5.5} rx={1} {...common} />
          <Line x1={12} y1={9} x2={12} y2={13} {...common} stroke={spot} strokeWidth={2.2} />
        </>
      );

    // Stimmungsmacher - zwei Sprechblasen, die sich ins Wort fallen.
    case 'bubbles':
      return (
        <>
          <Path d="M3 6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3.5 3v-3H5a2 2 0 0 1-2-2z" {...common} />
          <Path d="M18.5 9h1.5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.6v2.6L16 17h-2" {...common} fill={spot} fillOpacity={0.18} />
        </>
      );

    // Scharfschütze - Ringe und Fadenkreuz, Volltreffer in der Mitte.
    case 'target':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Circle cx={12} cy={12} r={4.5} {...common} />
          <Circle cx={12} cy={12} r={1.6} fill={spot} stroke="none" />
          <Line x1={12} y1={1.5} x2={12} y2={4} {...common} />
          <Line x1={12} y1={20} x2={12} y2={22.5} {...common} />
          <Line x1={1.5} y1={12} x2={4} y2={12} {...common} />
          <Line x1={20} y1={12} x2={22.5} y2={12} {...common} />
        </>
      );

    // Stammgast - der Kalender mit dem Haken.
    case 'calendar':
      return (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2.5} {...common} />
          <Line x1={3} y1={9.5} x2={21} y2={9.5} {...common} />
          <Line x1={8} y1={2.5} x2={8} y2={6} {...common} />
          <Line x1={16} y1={2.5} x2={16} y2={6} {...common} />
          <Path d="M8.5 15.2 L11 17.6 L15.8 12.6" {...common} stroke={spot} strokeWidth={2.2} />
        </>
      );

    // Botschafter - drei Knoten, verbunden.
    case 'network':
      return (
        <>
          <Line x1={7.4} y1={8.6} x2={12} y2={5.6} {...common} />
          <Line x1={7.4} y1={11.4} x2={12} y2={16.4} {...common} />
          <Circle cx={5} cy={10} r={2.6} {...common} />
          <Circle cx={17.5} cy={5} r={2.6} {...common} fill={spot} fillOpacity={0.24} />
          <Circle cx={15} cy={18} r={2.6} {...common} />
        </>
      );

    // Aufsteiger - drei Winkel nach oben, der oberste voll.
    case 'chevrons':
      return (
        <>
          <Path d="M5 19.5 L12 14 L19 19.5" {...common} />
          <Path d="M5 13.5 L12 8 L19 13.5" {...common} />
          <Path d="M6.5 7 L12 2.8 L17.5 7" {...common} stroke={spot} strokeWidth={2.2} />
        </>
      );

    // Vorsorger - Schild mit Haken.
    case 'shield':
      return (
        <>
          <Path d="M12 2.5 L20 5.6 v6.2c0 4.5-3.3 8.1-8 9.7-4.7-1.6-8-5.2-8-9.7V5.6z" {...common} />
          <Path d="M8.3 11.9 L11 14.6 L15.9 9.4" {...common} stroke={spot} strokeWidth={2.2} />
        </>
      );

    // Unbekannter Schlüssel: ein Ring statt einer leeren Fläche, damit ein
    // neues Badge ohne passende Form nicht unsichtbar wird.
    default:
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Circle cx={12} cy={12} r={2.4} fill={spot} stroke="none" />
        </>
      );
  }
}
