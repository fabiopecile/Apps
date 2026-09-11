import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Reveal } from '@/components/ui/Reveal';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT, type TranslationKey } from '@/lib/i18n';
import { FREE_TRACKED_GAMES_PER_WEEK, trackedGamesLeft } from '@/lib/entitlement';
import { formatPrice, looksLikeLicence, normaliseLicence, prettyLicence } from '@/lib/licence';
import {
  CHECKOUT_REDIRECTS,
  SHOP_CLOSED,
  claimLicence,
  fetchShop,
  startCheckout,
  verifyLicence,
  type ShopInfo,
} from '@/lib/shop';
import { useLanguage } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}[] = [
  // Things that do not exist yet. Online play, highlight clips and the save
  // backup all came off this list when they were built — all three are free —
  // and nothing goes back on it just because it would look good above a price.
  { icon: 'scan', titleKey: 'pro.feature.detect.title', bodyKey: 'pro.feature.detect.body' },
  { icon: 'stats-chart', titleKey: 'pro.feature.stats.title', bodyKey: 'pro.feature.stats.body' },
  { icon: 'color-palette', titleKey: 'pro.feature.skins.title', bodyKey: 'pro.feature.skins.body' },
];

type Busy = 'idle' | 'starting' | 'claiming' | 'restoring';

export default function ProScreen() {
  const params = useLocalSearchParams<{ paid?: string }>();
  const notifyRequested = useBeerpongStore((s) => s.proNotifyRequested);
  const setNotifyRequested = useBeerpongStore((s) => s.setProNotifyRequested);
  const pro = useBeerpongStore((s) => s.pro);
  const setPro = useBeerpongStore((s) => s.setPro);
  const licence = useBeerpongStore((s) => s.licence);
  const redeemLicence = useBeerpongStore((s) => s.redeemLicence);
  const trackerUse = useBeerpongStore((s) => s.trackerUse);
  const feedback = useFeedback();
  const t = useT();
  const language = useLanguage();

  const [shop, setShop] = useState<ShopInfo>(SHOP_CLOSED);
  const [busy, setBusy] = useState<Busy>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);

  const left = trackedGamesLeft(trackerUse, new Date(), pro);
  const price = formatPrice(shop.amount, shop.currency, language === 'de' ? 'de-DE' : 'en-GB');

  useEffect(() => {
    let alive = true;
    fetchShop().then((info) => {
      if (alive) setShop(info);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Coming back from Stripe.
   *
   * The session id in the address bar is only a claim — the server asks Stripe
   * whether it was actually paid before it hands out a code, because an address
   * bar is something anybody can type into.
   */
  const paid = params.paid;
  useEffect(() => {
    if (!paid || paid === 'cancelled') return;
    let alive = true;
    setBusy('claiming');
    claimLicence(paid).then((granted) => {
      if (!alive) return;
      setBusy('idle');
      if (granted) {
        redeemLicence(normaliseLicence(granted));
        feedback.victory();
      } else {
        setProblem(t('shop.notPaid'));
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  const buy = useCallback(async () => {
    feedback.tap();
    setProblem(null);
    setBusy('starting');
    const session = await startCheckout('/pro');
    setBusy('idle');
    if (!session) {
      setProblem(t('shop.startFailed'));
      return;
    }
    if (CHECKOUT_REDIRECTS) {
      // A full navigation, not a new tab: an in-app browser on a phone often
      // refuses to open one, and the whole flow comes back here anyway.
      window.location.href = session.url;
      return;
    }
    // Native: the payment happens in the browser and unlocks the web app; the
    // code brings it back here. Better than a deep link that half works.
    Linking.openURL(session.url);
    setRestoreOpen(true);
  }, [feedback, t]);

  const restore = useCallback(async () => {
    feedback.tap();
    setProblem(null);
    setBusy('restoring');
    const ok = await verifyLicence(code);
    setBusy('idle');
    if (ok) {
      redeemLicence(normaliseLicence(code));
      feedback.victory();
      setCode('');
      setRestoreOpen(false);
    } else {
      setProblem(t('shop.badCode'));
    }
  }, [code, feedback, redeemLicence, t]);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('pro.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, glow('soft', colors.gold)]}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={30} color={colors.gold} />
            </View>
            <Text style={styles.heroTitle}>{t('pro.heroTitle')}</Text>
            <Text style={styles.heroBody}>{t('pro.heroBody')}</Text>
            {/* Only while there is nothing to buy. Next to a price it would
                simply be untrue. */}
            {!shop.enabled && !licence ? (
              <View style={styles.soonChip}>
                <Text style={styles.soonText} selectable={false}>
                  {t('pro.inDevelopment')}
                </Text>
              </View>
            ) : null}
          </View>

          <SectionLabel>{t('free.label')}</SectionLabel>
          <View style={styles.allowanceCard}>
            <View style={styles.allowanceRow}>
              <Ionicons
                name={left === null || left > 0 ? 'videocam' : 'videocam-off'}
                size={18}
                color={left === 0 ? colors.textMuted : colors.neon}
              />
              <Text style={styles.allowanceTitle}>
                {left === null
                  ? t('free.unlimited')
                  : left > 0
                    ? t('free.left', { left, total: FREE_TRACKED_GAMES_PER_WEEK })
                    : t('free.none', { total: FREE_TRACKED_GAMES_PER_WEEK })}
              </Text>
            </View>
            {left === null ? null : (
              <Text style={styles.explainBody}>
                {t('free.resets', { total: FREE_TRACKED_GAMES_PER_WEEK })}
              </Text>
            )}
            <Text style={styles.explainBody}>{t('free.arcadeFree')}</Text>
          </View>

          <SectionLabel>{t('pro.whatsInside')}</SectionLabel>
          {shop.enabled || licence ? (
            <Text style={[styles.explainBody, styles.plannedNote]}>{t('shop.plannedNote')}</Text>
          ) : null}
          {FEATURES.map((feature, position) => (
            <Reveal key={feature.titleKey} index={position} delay={120}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                <Text style={styles.featureBody}>{t(feature.bodyKey)}</Text>
              </View>
            </View>
            </Reveal>
          ))}

          <SectionLabel>{t('pro.howItWorks')}</SectionLabel>
          <View style={styles.explainCard}>
            <Text style={styles.explainTitle}>{t('pro.explainDetectTitle')}</Text>
            <Text style={styles.explainBody}>{t('pro.explainBody')}</Text>
          </View>
          <View style={styles.explainCard}>
            <Text style={styles.explainTitle}>{t('pro.explainOnlineTitle')}</Text>
            <Text style={styles.explainBody}>{t('pro.explainOnlineBody')}</Text>
          </View>

          {/* Already bought: the code, and nothing to sell. */}
          {licence ? (
            <View style={[styles.buyCard, { borderColor: colors.neon }, glow('soft')]}>
              <Ionicons name="checkmark-circle" size={30} color={colors.neon} />
              <Text style={styles.buyTitle}>{t('shop.owned')}</Text>
              <Text style={styles.explainBody}>{t('shop.ownedBody')}</Text>
              <Text style={styles.codeLabel}>{t('shop.yourCode')}</Text>
              <Text style={styles.codeValue} selectable>
                {prettyLicence(licence)}
              </Text>
              <Text style={styles.explainBody}>{t('shop.codeHint')}</Text>
            </View>
          ) : shop.enabled ? (
            <View style={[styles.buyCard, glow('soft', colors.gold)]}>
              <Text style={styles.buyTitle}>{t('pro.heroTitle')}</Text>
              <Text style={styles.explainBody}>{t('shop.buySub')}</Text>
              {busy === 'claiming' ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={colors.gold} />
                  <Text style={styles.explainBody}>{t('shop.checking')}</Text>
                </View>
              ) : (
                <GlowButton
                  label={t('shop.buy', { price })}
                  accent={colors.gold}
                  size="lg"
                  disabled={busy !== 'idle'}
                  onPress={buy}
                  style={styles.notifyButton}
                />
              )}
              {!CHECKOUT_REDIRECTS ? (
                <Text style={styles.explainBody}>{t('shop.nativeHint')}</Text>
              ) : null}
              <Text style={styles.disclaimer}>{t('shop.stripeNote')}</Text>
            </View>
          ) : (
            <>
              <GlowButton
                label={notifyRequested ? t('pro.notifyOn') : t('pro.notifyCta')}
                variant={notifyRequested ? 'outline' : 'filled'}
                accent={colors.gold}
                size="lg"
                onPress={() => {
                  feedback.tap();
                  setNotifyRequested(!notifyRequested);
                }}
                style={styles.notifyButton}
              />
              <Text style={styles.disclaimer}>{t('pro.disclaimer')}</Text>
            </>
          )}

          {params.paid === 'cancelled' && !licence ? (
            <Text style={styles.problem}>{t('shop.cancelled')}</Text>
          ) : null}
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}

          {/* A code from another phone. Folded away, because most people
              arriving here have not got one. */}
          {!licence && shop.enabled ? (
            restoreOpen ? (
              <View style={styles.restoreCard}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={t('shop.codePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.neon}
                  style={styles.codeInput}
                />
                <GlowButton
                  label={t('shop.restoreAction')}
                  variant="outline"
                  size="sm"
                  disabled={!looksLikeLicence(code) || busy !== 'idle'}
                  onPress={restore}
                />
              </View>
            ) : (
              <Pressable onPress={() => setRestoreOpen(true)} style={styles.restoreLink}>
                <Text style={styles.restoreText}>{t('shop.restore')}</Text>
              </Pressable>
            )
          ) : null}

          {/* Only while nothing is actually for sale. A limit with no way past
              it would lock people out of a feature nobody can buy yet — and the
              moment there is a way past it, this has no business existing. */}
          {!shop.enabled && !licence ? (
            <View style={styles.devCard}>
              <Text style={styles.devTitle}>{t('free.devTitle')}</Text>
              <Text style={styles.explainBody}>{t('free.devBody')}</Text>
              <GlowButton
                label={pro ? t('free.devOn') : t('free.devOff')}
                variant="outline"
                accent={pro ? colors.neon : colors.textSecondary}
                size="sm"
                onPress={() => {
                  feedback.tap();
                  setPro(!pro);
                }}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.gold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  heroTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  heroBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  soonChip: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  soonText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  featureBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  allowanceCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  allowanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allowanceTitle: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  buyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.backgroundCard,
    marginTop: spacing.sm,
  },
  buyTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  codeLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  codeValue: {
    fontFamily: fonts.numeric,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.neon,
  },
  plannedNote: {
    marginBottom: spacing.sm,
    color: colors.gold,
  },
  problem: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  restoreLink: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  restoreText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  restoreCard: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  codeInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontFamily: fonts.numeric,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  devCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderFaint,
    padding: spacing.md,
    gap: spacing.sm,
  },
  devTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  explainCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  explainTitle: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  explainBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  notifyButton: {
    width: '100%',
  },
  disclaimer: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
