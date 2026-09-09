import { View, Text, Image, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { MonthlyPrize } from '@/lib/database.types';

interface PrizeCardProps {
  prize: MonthlyPrize | null;
  periodLabel: string;
  /** How many tips the reader has this month, to show their eligibility. */
  myTips?: number;
}

export function PrizeCard({ prize, periodLabel, myTips }: PrizeCardProps) {
  if (!prize) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="trophy-outline" size={18} color={colors.textFaint} />
        <Text style={styles.emptyText}>Für {periodLabel} ist noch kein Preis ausgeschrieben.</Text>
      </View>
    );
  }

  const eligible = myTips === undefined || myTips >= prize.min_tips;
  const missing = prize.min_tips - (myTips ?? 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="trophy" size={18} color={colors.gold} />
        <Text style={styles.period}>{periodLabel}</Text>
      </View>

      <View style={styles.body}>
        {prize.image_url ? <Image source={{ uri: prize.image_url }} style={styles.image} /> : null}
        <View style={styles.text}>
          <Text style={styles.title}>{prize.title}</Text>
          {prize.description ? <Text style={styles.description}>{prize.description}</Text> : null}
          <Text style={styles.places}>
            Für die {prize.places === 1 ? 'beste Person' : `besten ${prize.places}`} am Monatsende
          </Text>
        </View>
      </View>

      {prize.sponsor_name ? (
        <Pressable
          style={styles.sponsor}
          onPress={() => prize.sponsor_url && Linking.openURL(prize.sponsor_url)}
          disabled={!prize.sponsor_url}
        >
          <Text style={styles.sponsorText}>Gestiftet von {prize.sponsor_name}</Text>
          {prize.sponsor_url ? <Ionicons name="open-outline" size={13} color={colors.textMuted} /> : null}
        </Pressable>
      ) : null}

      {!eligible ? (
        <View style={styles.eligibility}>
          <Ionicons name="information-circle-outline" size={14} color={colors.blue} />
          <Text style={styles.eligibilityText}>
            Noch {missing} {missing === 1 ? 'Tipp' : 'Tipps'} diesen Monat, dann bist du dabei.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  period: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 0.6 },
  body: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  image: { width: 62, height: 62, borderRadius: radii.md, backgroundColor: colors.surface },
  text: { flex: 1 },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.md, letterSpacing: -0.2 },
  description: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2, lineHeight: 16 },
  places: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '600', marginTop: 4 },
  sponsor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(227,179,65,0.3)',
    paddingTop: spacing.sm,
  },
  sponsorText: { color: colors.textMuted, fontSize: fontSizes.xs },
  eligibility: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eligibilityText: { flex: 1, color: colors.blue, fontSize: fontSizes.xs },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyText: { flex: 1, color: colors.textMuted, fontSize: fontSizes.xs },
});
