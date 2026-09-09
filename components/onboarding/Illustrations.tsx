import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useCountUp, useEnter, usePulse, useRamp, enterStyle } from './animations';

/**
 * The animated illustrations for the intro, in the language of the promo
 * graphics: near-black ground, one saturated accent per screen, oversized
 * numerals, pill badges. Each takes `active` and plays when its slide arrives.
 */

interface Props {
  active: boolean;
}

// ---------------------------------------------------------------------------
// 1 - Welcome
// ---------------------------------------------------------------------------
export function WelcomeArt({ active }: Props) {
  const ball = useEnter(active);
  const pulse = usePulse(active);
  const wordmark = useEnter(active, 260);

  return (
    <View style={styles.stage}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.ballCircle, enterStyle(ball, 24)]}>
        <Ionicons name="football" size={54} color={colors.white} />
      </Animated.View>
      <Animated.Text style={[styles.wordmark, enterStyle(wordmark, 12)]}>TEAMUP11</Animated.Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2 - Placing a tip
// ---------------------------------------------------------------------------
export function TipArt({ active }: Props) {
  const home = useCountUp(active, 2, 500, 200);
  const away = useCountUp(active, 1, 500, 450);
  const box = useEnter(active);
  const stamp = useEnter(active, 1000);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.teamRow, enterStyle(box, 10)]}>
        <Text style={styles.teamName}>RAPID</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName}>STURM</Text>
      </Animated.View>

      <Animated.View style={[styles.scoreRow, enterStyle(box, 20)]}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{home}</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{away}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.stamp, enterStyle(stamp, 8)]}>
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text style={styles.stampText}>TIPP GESPEICHERT</Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3 - What a tip is worth
// ---------------------------------------------------------------------------
const POINT_TIERS = [
  { value: '5', label: 'EXAKT', color: colors.success },
  { value: '3', label: 'TENDENZ', color: colors.blue },
  { value: '0', label: 'DANEBEN', color: colors.textFaint },
];

export function PointsArt({ active }: Props) {
  return (
    <View style={[styles.stage, styles.rowStage]}>
      {POINT_TIERS.map((tier, i) => (
        <PointBadge key={tier.value} tier={tier} active={active} delay={i * 180} />
      ))}
    </View>
  );
}

function PointBadge({
  tier,
  active,
  delay,
}: {
  tier: (typeof POINT_TIERS)[number];
  active: boolean;
  delay: number;
}) {
  const enter = useEnter(active, delay);
  return (
    <Animated.View style={[styles.pointColumn, enterStyle(enter, 28)]}>
      <View style={[styles.pointBadge, { borderColor: tier.color }]}>
        <Text style={[styles.pointValue, { color: tier.color }]}>{tier.value}</Text>
      </View>
      <Text style={styles.pointLabel}>{tier.label}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 4 - Jokers
// ---------------------------------------------------------------------------
const JOKERS = [
  { emoji: '⚡', name: 'BOOST', detail: '×2 Punkte', rotate: '-8deg' },
  { emoji: '🎲', name: 'RISIKO', detail: 'Glückssache', rotate: '0deg' },
  { emoji: '🛡️', name: 'SICHER', detail: 'Rettet 1 Punkt', rotate: '8deg' },
];

export function JokerArt({ active }: Props) {
  return (
    <View style={[styles.stage, styles.rowStage]}>
      {JOKERS.map((joker, i) => (
        <JokerCard key={joker.name} joker={joker} active={active} delay={i * 160} />
      ))}
    </View>
  );
}

function JokerCard({
  joker,
  active,
  delay,
}: {
  joker: (typeof JOKERS)[number];
  active: boolean;
  delay: number;
}) {
  const enter = useEnter(active, delay);
  return (
    <Animated.View
      style={[
        styles.jokerCard,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { rotate: joker.rotate },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
          ],
        },
      ]}
    >
      <Text style={styles.jokerEmoji}>{joker.emoji}</Text>
      <Text style={styles.jokerName}>{joker.name}</Text>
      <Text style={styles.jokerDetail}>{joker.detail}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 5 - The insurance
// ---------------------------------------------------------------------------
export function InsuranceArt({ active }: Props) {
  const shield = useEnter(active);
  const fill = useRamp(active, 900, 500);
  const bonus = useEnter(active, 1200);
  const points = useCountUp(active, 9, 900, 500);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.shieldCircle, enterStyle(shield, 20)]}>
        <Ionicons name="shield-checkmark" size={44} color={colors.gold} />
      </Animated.View>

      <View style={styles.barTrack}>
        {/* Everything up to 4 is what the matchday actually produced; the gold
            part is what the policy adds on top. */}
        <View style={styles.barActual} />
        <Animated.View
          style={[
            styles.barTopUp,
            {
              // Order matters: transforms compose left to right, so a
              // translate listed after a scale gets scaled too and the bar
              // drifts instead of growing off its left edge. Translate first.
              transform: [
                { translateX: fill.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                { scaleX: fill },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.barLegend}>
        <Text style={styles.barLegendText}>{points} Punkte</Text>
        <Animated.View style={[styles.bonusPill, enterStyle(bonus, 8)]}>
          <Text style={styles.bonusText}>+5 aufgefüllt</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 6 - Feed and stories
// ---------------------------------------------------------------------------
export function SocialArt({ active }: Props) {
  const card = useEnter(active, 420);
  const heart = useEnter(active, 900);

  return (
    <View style={styles.stage}>
      <View style={styles.storyRow}>
        {[colors.red, colors.blue, colors.gold, colors.success].map((color, i) => (
          <StoryRing key={color} color={color} active={active} delay={i * 120} />
        ))}
      </View>

      <Animated.View style={[styles.postCard, enterStyle(card, 24)]}>
        <View style={styles.postImage}>
          <Ionicons name="image" size={26} color={colors.textFaint} />
        </View>
        <View style={styles.postMeta}>
          <View style={styles.postLineWide} />
          <View style={styles.postLine} />
        </View>
        <Animated.View style={enterStyle(heart, 6)}>
          <Ionicons name="heart" size={22} color={colors.red} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function StoryRing({ color, active, delay }: { color: string; active: boolean; delay: number }) {
  const enter = useEnter(active, delay);
  return (
    <Animated.View style={[styles.storyRing, { borderColor: color }, enterStyle(enter, 12)]}>
      <Ionicons name="person" size={18} color={colors.textFaint} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// 7 - Duels
// ---------------------------------------------------------------------------
export function DuelArt({ active }: Props) {
  const left = useRamp(active, 700, 100);
  const right = useRamp(active, 700, 100);
  const flash = useEnter(active, 700);

  return (
    <View style={styles.stage}>
      <View style={styles.duelRow}>
        <Animated.View
          style={[
            styles.duelAvatar,
            { borderColor: colors.red },
            {
              opacity: left,
              transform: [{ translateX: left.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }],
            },
          ]}
        >
          <Ionicons name="person" size={24} color={colors.red} />
        </Animated.View>

        <Animated.View style={[styles.flashCircle, enterStyle(flash, 0)]}>
          <Ionicons name="flash" size={22} color={colors.black} />
        </Animated.View>

        <Animated.View
          style={[
            styles.duelAvatar,
            { borderColor: colors.blue },
            {
              opacity: right,
              transform: [{ translateX: right.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }],
            },
          ]}
        >
          <Ionicons name="person" size={24} color={colors.blue} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.xpPill, enterStyle(flash, 10)]}>
        <Text style={styles.xpText}>SIEGER: +30 XP</Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 8 - Wheel and coins
// ---------------------------------------------------------------------------
const WHEEL_COLORS = [colors.red, colors.gold, colors.blue, colors.success, colors.red, colors.gold, colors.blue, colors.success];

export function WheelArt({ active }: Props) {
  const spin = useRamp(active, 2200, 150);
  const coins = useCountUp(active, 25, 900, 1600);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });

  return (
    <View style={styles.stage}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          <G>
            {WHEEL_COLORS.map((color, i) => {
              // Eight equal wedges drawn as pie slices from the centre.
              const start = (i * 360) / 8;
              const end = ((i + 1) * 360) / 8;
              const toXY = (deg: number) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return [50 + 46 * Math.cos(rad), 50 + 46 * Math.sin(rad)];
              };
              const [x1, y1] = toXY(start);
              const [x2, y2] = toXY(end);
              return (
                <Path
                  key={i}
                  d={`M50 50 L${x1} ${y1} A46 46 0 0 1 ${x2} ${y2} Z`}
                  fill={color}
                  opacity={0.85}
                />
              );
            })}
            <Circle cx={50} cy={50} r={14} fill={colors.background} stroke={colors.borderStrong} strokeWidth={2} />
          </G>
        </Svg>
      </Animated.View>

      <View style={styles.coinPill}>
        <Ionicons name="logo-bitcoin" size={16} color={colors.gold} />
        <Text style={styles.coinText}>+{coins} Coins</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 9 - Monthly ranking and prize
// ---------------------------------------------------------------------------
const BARS = [
  { height: 0.55, color: colors.blue, place: '2' },
  { height: 1, color: colors.gold, place: '1' },
  { height: 0.38, color: colors.red, place: '3' },
];

export function RankingArt({ active }: Props) {
  const trophy = useEnter(active, 900);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.trophyCircle, enterStyle(trophy, 16)]}>
        <Ionicons name="trophy" size={28} color={colors.gold} />
      </Animated.View>

      <View style={styles.barsRow}>
        {BARS.map((bar, i) => (
          <RankBar key={bar.place} bar={bar} active={active} delay={i * 150} />
        ))}
      </View>

      <Animated.View style={[styles.prizePill, enterStyle(trophy, 8)]}>
        <Text style={styles.prizeText}>JEDEN MONAT EIN PREIS</Text>
      </Animated.View>
    </View>
  );
}

function RankBar({ bar, active, delay }: { bar: (typeof BARS)[number]; active: boolean; delay: number }) {
  const grow = useRamp(active, 700, delay);
  const maxHeight = 90;
  return (
    <View style={styles.barColumn}>
      <Animated.View
        style={[
          styles.rankBar,
          {
            backgroundColor: bar.color,
            height: maxHeight * bar.height,
            // Translate before scale for the same reason as the insurance
            // bar: the other order scales the offset and the bar floats.
            transform: [
              {
                translateY: grow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [(maxHeight * bar.height) / 2, 0],
                }),
              },
              { scaleY: grow },
            ],
          },
        ]}
      />
      <Text style={styles.barPlace}>{bar.place}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 10 - Pro
// ---------------------------------------------------------------------------
export function ProArt({ active }: Props) {
  const card = useEnter(active);
  const shine = useRamp(active, 1400, 500);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.proCard, enterStyle(card, 20)]}>
        <Animated.View
          style={[
            styles.shine,
            {
              transform: [
                { rotate: '18deg' },
                { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 200] }) },
              ],
            },
          ]}
        />
        <Text style={styles.proBadge}>PRO</Text>
        <View style={styles.proList}>
          {['Keine Werbung', 'KI-Statistik', 'Eigener Rahmen'].map((line) => (
            <View key={line} style={styles.proRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
              <Text style={styles.proLine}>{line}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, minHeight: 220 },
  rowStage: { flexDirection: 'row', gap: spacing.md },

  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.redGlow,
  },
  ballCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: 2 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamName: { color: colors.textMuted, fontWeight: '800', fontSize: fontSizes.sm, letterSpacing: 0.5 },
  vs: { color: colors.textFaint, fontSize: fontSizes.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreBox: {
    width: 74,
    height: 84,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.blue,
    backgroundColor: colors.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: colors.white, fontSize: 44, fontWeight: '900' },
  colon: { color: colors.textFaint, fontSize: 32, fontWeight: '800' },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  stampText: { color: colors.success, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  pointColumn: { alignItems: 'center', gap: spacing.sm },
  pointBadge: {
    width: 78,
    height: 78,
    borderRadius: radii.lg,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointValue: { fontSize: 38, fontWeight: '900' },
  pointLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  jokerCard: {
    width: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  jokerEmoji: { fontSize: 26 },
  jokerName: { color: colors.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  jokerDetail: { color: colors.textFaint, fontSize: 10 },

  shieldCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    flexDirection: 'row',
    width: 220,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barActual: { width: 100, backgroundColor: colors.blue },
  barTopUp: { width: 120, backgroundColor: colors.gold },
  barLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLegendText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  bonusPill: {
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  bonusText: { color: colors.gold, fontSize: 11, fontWeight: '800' },

  storyRow: { flexDirection: 'row', gap: spacing.sm },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: 250,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  postImage: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMeta: { flex: 1, gap: 6 },
  postLineWide: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  postLine: { height: 8, width: '60%', borderRadius: 4, backgroundColor: colors.surfaceAlt },

  duelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  duelAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpPill: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  xpText: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldDark,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  coinText: { color: colors.gold, fontWeight: '800', fontSize: fontSizes.sm },

  trophyCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, height: 100 },
  barColumn: { alignItems: 'center', gap: spacing.xs },
  rankBar: { width: 38, borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm },
  barPlace: { color: colors.textFaint, fontSize: 11, fontWeight: '800' },
  prizePill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  prizeText: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  proCard: {
    width: 240,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldDark,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -40,
    width: 60,
    height: 260,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  proBadge: { color: colors.gold, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  proList: { gap: spacing.sm },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proLine: { color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' },
});
