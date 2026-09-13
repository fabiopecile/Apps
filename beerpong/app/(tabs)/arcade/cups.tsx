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
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { CupPreview } from '@/components/arcade/CupPreview';
import {
  CUP_BUNDLE_ITEM,
  designsUnlockedBy,
  itemForDesign,
  priceOfItem,
} from '@/lib/catalogue';
import { DEFAULT_CUP_SKIN, PAID_CUP_DESIGNS, cupDesign } from '@/lib/cupSkins';
import { formatPrice, looksLikeLicence, normaliseLicence } from '@/lib/licence';
import {
  CHECKOUT_REDIRECTS,
  SHOP_CLOSED,
  claimLicence,
  fetchShop,
  startCheckout,
  verifyLicence,
  type ShopInfo,
} from '@/lib/shop';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useLanguage, useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Cup designs, and buying them.
 *
 * Separate from the coin shop next door on purpose. Those skins are earned by
 * playing and cost coins; these cost money, and mixing the two into one grid
 * would make every coin price look like a soft sell for a real one.
 *
 * Each design is its own purchase and its own code, so somebody who buys
 * Austria has a receipt for Austria — see `lib/licence.ts` for why the code has
 * to say which thing it opens.
 */
export default function CupShopScreen() {
  const params = useLocalSearchParams<{ paid?: string }>();
  const t = useT();
  const language = useLanguage();
  const feedback = useFeedback();

  const owned = useBeerpongStore((s) => s.ownedCupSkins);
  const equipped = useBeerpongStore((s) => s.equippedCupSkin);
  const equip = useBeerpongStore((s) => s.equipCupSkin);
  const redeem = useBeerpongStore((s) => s.redeemCupLicence);

  const [shop, setShop] = useState<ShopInfo>(SHOP_CLOSED);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchShop().then((info) => alive && setShop(info));
    return () => {
      alive = false;
    };
  }, []);

  const priceOf = (item: string) => {
    const cents = shop.prices[item] ?? priceOfItem(item) ?? 0;
    return formatPrice(cents, shop.currency, language === 'de' ? 'de-DE' : 'en-GB');
  };

  /** Coming back from Stripe with a session id in the address bar. */
  const paid = params.paid;
  useEffect(() => {
    if (!paid || paid === 'cancelled') return;
    let alive = true;
    setBusy('claim');
    claimLicence(paid).then((result) => {
      if (!alive) return;
      setBusy(null);
      const designs = result ? designsUnlockedBy(result.item) : [];
      if (!result || designs.length === 0) {
        setProblem(t('shop.notPaid'));
        return;
      }
      redeem(normaliseLicence(result.licence), designs);
      setNote(t('cups.bought', { code: result.licence }));
      feedback.victory();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  const buy = useCallback(
    async (item: string) => {
      feedback.tap();
      setProblem(null);
      setNote(null);
      setBusy(item);
      const session = await startCheckout('/(tabs)/arcade/cups', item);
      setBusy(null);
      if (!session) {
        setProblem(t('shop.startFailed'));
        return;
      }
      if (CHECKOUT_REDIRECTS) {
        window.location.href = session.url;
        return;
      }
      Linking.openURL(session.url);
      setRestoreOpen(true);
    },
    [feedback, t]
  );

  /**
   * A code typed in by hand — a second phone, or one that was replaced.
   *
   * Which design it belongs to is not written on the code, so every item it
   * could be is tried. Thirteen requests sounds worse than it is: they go out
   * together and the server does an HMAC each, and it only ever happens when
   * somebody presses the button.
   */
  const restore = useCallback(async () => {
    feedback.tap();
    setProblem(null);
    setNote(null);
    setBusy('restore');
    const items = [CUP_BUNDLE_ITEM, ...PAID_CUP_DESIGNS.map((design) => itemForDesign(design.id))];
    const results = await Promise.all(
      items.map(async (item) => ((await verifyLicence(code, item)) ? item : null))
    );
    const found = results.find((item): item is string => item != null);
    setBusy(null);
    if (!found) {
      setProblem(t('shop.badCode'));
      return;
    }
    redeem(normaliseLicence(code), designsUnlockedBy(found));
    feedback.victory();
    setCode('');
    setRestoreOpen(false);
  }, [code, feedback, redeem, t]);

  const bundlePrice = priceOf(CUP_BUNDLE_ITEM);
  const hasAll = PAID_CUP_DESIGNS.every((design) => owned.includes(design.id));

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('cups.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>{t('cups.intro')}</Text>

          {note ? <Text style={styles.note}>{note}</Text> : null}
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}

          {/* The plain cup, so putting the flags away again is one tap. */}
          <SectionLabel>{t('cups.yours')}</SectionLabel>
          <View style={styles.row}>
            {[DEFAULT_CUP_SKIN, ...owned.filter((id) => id !== DEFAULT_CUP_SKIN)].map((id) => {
              const design = cupDesign(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    feedback.tap();
                    equip(id);
                  }}
                  style={[styles.ownedCard, equipped === id && { borderColor: design.accent }]}
                >
                  <CupPreview design={design} size={54} />
                  <Text style={styles.ownedName} numberOfLines={1} selectable={false}>
                    {design.name}
                  </Text>
                  {equipped === id ? (
                    <Text style={[styles.ownedTag, { color: design.accent }]} selectable={false}>
                      {t('cups.onTheTable')}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {hasAll ? null : (
            <>
              <SectionLabel>{t('cups.forSale')}</SectionLabel>
              {!shop.enabled ? <Text style={styles.closed}>{t('cups.closed')}</Text> : null}

              {PAID_CUP_DESIGNS.map((design) => {
                const item = itemForDesign(design.id);
                const isOwned = owned.includes(design.id);
                return (
                  <View key={design.id} style={styles.saleRow}>
                    <CupPreview design={design} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleName} selectable={false}>
                        {design.flag} {design.name}
                      </Text>
                      <Text style={styles.saleBody} selectable={false}>
                        {isOwned ? t('cups.owned') : t('cups.oneOff')}
                      </Text>
                    </View>
                    {isOwned ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.neon} />
                    ) : busy === item ? (
                      <ActivityIndicator color={colors.gold} />
                    ) : (
                      <GlowButton
                        label={priceOf(item)}
                        size="sm"
                        variant="outline"
                        accent={design.accent}
                        disabled={!shop.enabled}
                        onPress={() => buy(item)}
                      />
                    )}
                  </View>
                );
              })}

              <View style={styles.bundleCard}>
                <Text style={styles.bundleTitle}>{t('cups.bundleTitle')}</Text>
                <Text style={styles.saleBody}>
                  {t('cups.bundleBody', { count: PAID_CUP_DESIGNS.length, price: bundlePrice })}
                </Text>
                {busy === CUP_BUNDLE_ITEM ? (
                  <ActivityIndicator color={colors.gold} />
                ) : (
                  <GlowButton
                    label={t('cups.bundleBuy', { price: bundlePrice })}
                    disabled={!shop.enabled}
                    onPress={() => buy(CUP_BUNDLE_ITEM)}
                  />
                )}
              </View>
            </>
          )}

          {shop.enabled ? (
            restoreOpen ? (
              <View style={styles.restoreCard}>
                <Text style={styles.saleBody}>{t('cups.restoreBody')}</Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  style={styles.codeInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="BP-XXXX-XXXX-XXXX"
                  placeholderTextColor={colors.textMuted}
                />
                <GlowButton
                  label={t('shop.restoreAction')}
                  variant="outline"
                  disabled={!looksLikeLicence(code) || busy === 'restore'}
                  onPress={restore}
                />
              </View>
            ) : (
              <Pressable onPress={() => setRestoreOpen(true)} style={styles.restoreLink}>
                <Text style={styles.restoreText}>{t('cups.restore')}</Text>
              </Pressable>
            )
          ) : null}

          <Text style={styles.footnote}>{t('cups.footnote')}</Text>
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
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  note: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.neon,
    marginBottom: spacing.sm,
  },
  problem: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  closed: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  ownedCard: {
    width: 96,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    paddingVertical: spacing.sm,
  },
  ownedName: { fontFamily: fonts.label, fontSize: 11, color: colors.textPrimary },
  ownedTag: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 0.5 },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
    paddingVertical: spacing.sm,
  },
  saleName: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  saleBody: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary },
  bundleCard: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.sm,
    ...glow('soft', colors.gold),
  },
  bundleTitle: { fontFamily: fonts.headingBlack, fontSize: 17, color: colors.gold },
  restoreCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  codeInput: {
    fontFamily: fonts.numeric,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  restoreLink: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: 6 },
  restoreText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  footnote: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
