import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PopIn } from '@/components/PopIn';
import { CountUp } from '@/components/CountUp';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinPackages } from '@/hooks/useCoinPackages';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { CoinPackage } from '@/lib/database.types';

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

export default function CoinsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { packages, loading, error, refresh, buyPackage } = useCoinPackages();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  if (!profile) return null;
  if (loading) return <LoadingScreen />;

  const handleBuy = async (pkg: CoinPackage) => {
    setBusyKey(pkg.key);
    setBuyError(null);
    const { error: purchaseError } = await buyPackage(pkg.key);
    setBusyKey(null);
    if (purchaseError) setBuyError(purchaseError);
  };

  // The best value per euro gets the badge, worked out from the data rather
  // than hardcoded, so changing a price in the database moves the badge too.
  const bestValueKey = packages.reduce<{ key: string; ratio: number } | null>((best, pkg) => {
    const ratio = (pkg.coins + pkg.bonus_coins) / pkg.price_cents;
    return !best || ratio > best.ratio ? { key: pkg.key, ratio } : best;
  }, null)?.key;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Coins kaufen</Text>
          <CountUp value={profile.coins} style={styles.coins} format={(n) => `${n} Coins verfügbar`} />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ErrorBanner message={error} onRetry={refresh} />
        {buyError ? <Text style={styles.error}>{buyError}</Text> : null}

        {packages.map((pkg, index) => {
          const total = pkg.coins + pkg.bonus_coins;
          const isBest = pkg.key === bestValueKey;
          return (
            <PopIn key={pkg.key} delay={index * 70}>
              <Pressable
                style={[styles.card, isBest && styles.cardBest]}
                onPress={() => handleBuy(pkg)}
                disabled={busyKey !== null}
              >
                {isBest ? (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>BESTES ANGEBOT</Text>
                  </View>
                ) : null}

                <View style={styles.cardRow}>
                  <View style={[styles.coinIcon, isBest && styles.coinIconBest]}>
                    <Ionicons name="ellipse" size={26} color={colors.gold} />
                  </View>

                  <View style={styles.cardText}>
                    <Text style={styles.cardCoins}>{total.toLocaleString('de-AT')} Coins</Text>
                    <Text style={styles.cardLabel}>
                      {pkg.bonus_coins > 0
                        ? `${pkg.coins.toLocaleString('de-AT')} + ${pkg.bonus_coins.toLocaleString('de-AT')} gratis`
                        : pkg.label}
                    </Text>
                  </View>

                  <View style={[styles.priceButton, isBest && styles.priceButtonBest]}>
                    <Text style={[styles.priceText, isBest && styles.priceTextBest]}>
                      {busyKey === pkg.key ? '...' : formatPrice(pkg.price_cents, pkg.currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </PopIn>
          );
        })}

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            Coins sind virtuelle Gegenstände ohne Geldwert. Sie lassen sich nicht auszahlen oder übertragen
            und geben keinen Vorteil beim Tippen – nur Rahmen und Titel.
          </Text>
        </View>

        <Text style={styles.freeHint}>
          Coins gibt es auch gratis: einmal täglich am Glücksrad drehen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  coins: { color: colors.gold, fontSize: fontSizes.sm, marginTop: 2 },
  content: { padding: spacing.lg, gap: spacing.md },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardBest: { borderColor: colors.gold },
  bestBadge: {
    position: 'absolute',
    top: -1,
    right: spacing.lg,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  bestBadgeText: { color: colors.black, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coinIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconBest: { backgroundColor: colors.goldDark },
  cardText: { flex: 1 },
  cardCoins: { color: colors.text, fontSize: fontSizes.lg, fontWeight: '800', letterSpacing: -0.3 },
  cardLabel: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  priceButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 84,
    alignItems: 'center',
  },
  priceButtonBest: { backgroundColor: colors.gold, borderColor: colors.gold },
  priceText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  priceTextBest: { color: colors.black },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noticeText: { flex: 1, color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 17 },
  freeHint: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.xs },
});
