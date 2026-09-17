import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CoinChip } from '@/components/ui/CoinChip';
import { GridBackground } from '@/components/ui/GridBackground';
import { Reveal } from '@/components/ui/Reveal';
import { Card } from '@/components/ui/Card';
import { GlowButton } from '@/components/ui/GlowButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { BallArt } from '@/components/arcade/BallArt';
import { CupPreview } from '@/components/arcade/CupPreview';
import { COIN_CUP_DESIGNS, EARNED_CUP_DESIGNS } from '@/lib/cupSkins';
import { hoursUntilRotation, weeklyOffer, weeksUntilOffered } from '@/lib/cupShop';
import { WEEKEND_MATCHES } from '@/lib/competition';
import { useFeedback } from '@/lib/feedback';
import { SKINS, type SkinType } from '@/lib/skins';
import { useBeerpongStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/** Balls and tables are bought once; cups come round week by week. */
type Shelf = SkinType | 'cup';

export default function SkinsScreen() {
  const [filter, setFilter] = useState<Shelf>('ball');
  const coins = useBeerpongStore((s) => s.coins);
  const ownedSkinIds = useBeerpongStore((s) => s.ownedSkinIds);
  const equippedBall = useBeerpongStore((s) => s.arcade.equippedBall);
  const equippedTable = useBeerpongStore((s) => s.arcade.equippedTable);
  const buySkin = useBeerpongStore((s) => s.buySkin);
  const equipSkin = useBeerpongStore((s) => s.equipSkin);
  const t = useT();

  const equippedId = filter === 'ball' ? equippedBall : equippedTable;
  const skins = SKINS.filter((s) => s.type === filter);

  return (
    <View style={styles.container}>
      <GridBackground />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('skins.title')}</Text>
          <CoinChip coins={coins} />
        </View>

        <View style={styles.filterRow}>
          {(['ball', 'table', 'cup'] as Shelf[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => setFilter(type)}
              style={[styles.filterButton, filter === type && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
                {type === 'ball'
                  ? t('skins.balls')
                  : type === 'table'
                    ? t('skins.tables')
                    : t('skins.cups')}
              </Text>
            </Pressable>
          ))}
        </View>

        {filter === 'cup' ? <CupShelf /> : <FlatList
          data={skins}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => {
            const owned = ownedSkinIds.includes(item.id);
            const equipped = equippedId === item.id;
            const canAfford = coins >= item.cost;

            return (
              <Reveal index={index} style={styles.skinCardWrap}>
              <Card style={styles.skinCard} highlighted={equipped}>
                {item.type === 'ball' ? (
                  <View
                    style={[
                      styles.ballSwatchRing,
                      { borderColor: item.accent },
                      glow(equipped ? 'medium' : 'soft', item.accent),
                    ]}
                  >
                    <View style={styles.ballSwatch}>
                      <BallArt accent={item.accent} />
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.tableSwatch,
                      { borderColor: item.accent, backgroundColor: `${item.accent}22` },
                      glow(equipped ? 'medium' : 'soft', item.accent),
                    ]}
                  >
                    <View style={[styles.tableSwatchLine, { backgroundColor: item.accent }]} />
                  </View>
                )}
                <Text style={styles.skinName}>{item.name}</Text>
                <Text style={styles.skinDescription}>{t(item.descriptionKey)}</Text>

                {equipped ? (
                  <View style={styles.equippedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.neon} />
                    <Text style={styles.equippedText}>{t('skins.active')}</Text>
                  </View>
                ) : owned ? (
                  <GlowButton
                    label={t('skins.equip')}
                    variant="outline"
                    size="sm"
                    onPress={() => equipSkin(item.id)}
                  />
                ) : (
                  <GlowButton
                    label={t('skins.buy', { cost: item.cost })}
                    variant={canAfford ? 'filled' : 'ghost'}
                    // A price is gold, never green. Green is the app's word
                    // for "you" and "go", and a price you cannot afford
                    // rendered in it was the palette saying the opposite of
                    // the truth.
                    //
                    // Gold in BOTH states, though: `locked` grey under the
                    // disabled 40% opacity came out unreadable, and a price
                    // you cannot afford yet is exactly the number you want to
                    // read. The dimming alone carries "not yet".
                    accent={colors.reward}
                    size="sm"
                    disabled={!canAfford}
                    onPress={() => buySkin(item.id)}
                  />
                )}
              </Card>
              </Reveal>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />}
      </SafeAreaView>
    </View>
  );
}

/**
 * The rotating cup shelf.
 *
 * Three designs are on offer, the rest are shown greyed out with when they come
 * back. That second list is the whole point of the feature: an empty shop after
 * you have bought this week's three gives you no reason to keep earning, and a
 * shelf of things you can see but not have yet gives you twelve.
 *
 * The countdown is worked out from the date on every render rather than kept on
 * a timer — it is measured in hours and days, and a screen that is open long
 * enough for it to tick is a screen nobody is looking at.
 */
function CupShelf() {
  const t = useT();
  const feedback = useFeedback();
  const coins = useBeerpongStore((s) => s.coins);
  const owned = useBeerpongStore((s) => s.ownedCupSkins);
  const equipped = useBeerpongStore((s) => s.equippedCupSkin);
  const buyCupDesign = useBeerpongStore((s) => s.buyCupDesign);
  const equipCupSkin = useBeerpongStore((s) => s.equipCupSkin);

  const now = new Date();
  const offer = useMemo(() => weeklyOffer(now), [now.toDateString()]);
  const hours = hoursUntilRotation(now);
  const rest = COIN_CUP_DESIGNS.filter((design) => !offer.some((o) => o.id === design.id));

  return (
    <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      <SectionLabel>{t('skins.weekly')}</SectionLabel>
      <Text style={styles.rotation}>
        {hours >= 48
          ? t('skins.rotationDays', { days: Math.round(hours / 24) })
          : t('skins.rotationHours', { hours })}
      </Text>

      <View style={styles.cupRow}>
        {offer.map((design, index) => {
          const isOwned = owned.includes(design.id);
          const isOn = equipped === design.id;
          const cost = design.coins ?? 0;
          return (
            <Reveal key={design.id} index={index} style={styles.cupCardWrap}>
              <Card style={styles.cupCard} highlighted={isOn}>
                <View
                  style={[
                    styles.cupSwatch,
                    { borderColor: design.accent },
                    glow(isOn ? 'medium' : 'soft', design.accent),
                  ]}
                >
                  <CupPreview design={design} size={42} />
                </View>
                <Text style={styles.skinName}>{design.name}</Text>
                {isOn ? (
                  <View style={styles.equippedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.neon} />
                    <Text style={styles.equippedText}>{t('skins.active')}</Text>
                  </View>
                ) : isOwned ? (
                  <GlowButton
                    label={t('skins.equip')}
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      feedback.tap();
                      equipCupSkin(design.id);
                    }}
                  />
                ) : (
                  <GlowButton
                    label={t('skins.buy', { cost })}
                    variant={coins >= cost ? 'filled' : 'ghost'}
                    accent={colors.reward}
                    size="sm"
                    disabled={coins < cost}
                    onPress={() => {
                      if (buyCupDesign(design.id)) feedback.reward();
                    }}
                  />
                )}
              </Card>
            </Reveal>
          );
        })}
      </View>

      <Text style={styles.note}>{t('skins.cupsNote')}</Text>

      <SectionLabel>{t('skins.collection')}</SectionLabel>
      <View style={styles.cupRow}>
        {rest.map((design) => {
          const isOwned = owned.includes(design.id);
          const weeks = weeksUntilOffered(design.id, now);
          return (
            <View key={design.id} style={styles.cupCardWrap}>
              <Card style={[styles.cupCard, !isOwned && styles.cupCardDim]}>
                <View style={[styles.cupSwatch, { borderColor: colors.borderFaint }]}>
                  <CupPreview design={design} size={42} />
                </View>
                <Text style={styles.skinName}>{design.name}</Text>
                {isOwned ? (
                  equipped === design.id ? (
                    <View style={styles.equippedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.neon} />
                      <Text style={styles.equippedText}>{t('skins.active')}</Text>
                    </View>
                  ) : (
                    <GlowButton
                      label={t('skins.equip')}
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        feedback.tap();
                        equipCupSkin(design.id);
                      }}
                    />
                  )
                ) : (
                  <Text style={styles.soon}>
                    {weeks <= 1 ? t('skins.soonNext') : t('skins.soon', { weeks })}
                  </Text>
                )}
              </Card>
            </View>
          );
        })}
      </View>

      {/* Its own section, below the collection and clearly apart from it.
          Putting it in the grid would make it look like the twelfth pattern
          that happens to be locked — the whole point is that it is not on the
          same shelf, because no amount of coins reaches it. */}
      <SectionLabel>{t('skins.earned')}</SectionLabel>
      <View style={styles.cupRow}>
        {EARNED_CUP_DESIGNS.map((design) => {
          const isOwned = owned.includes(design.id);
          return (
            <View key={design.id} style={styles.earnedCardWrap}>
              <Card
                style={[styles.cupCard, !isOwned && styles.cupCardDim]}
                highlighted={equipped === design.id}
              >
                <View style={[styles.cupSwatch, { borderColor: colors.borderFaint }]}>
                  <CupPreview design={design} size={42} />
                </View>
                <Text style={styles.skinName}>{design.name}</Text>
                <View style={styles.notForSaleChip}>
                  <Text style={styles.notForSaleText} selectable={false}>
                    {t('skins.earnedOnly')}
                  </Text>
                </View>
                {isOwned ? (
                  equipped === design.id ? (
                    <View style={styles.equippedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.neon} />
                      <Text style={styles.equippedText}>{t('skins.active')}</Text>
                    </View>
                  ) : (
                    <GlowButton
                      label={t('skins.equip')}
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        feedback.tap();
                        equipCupSkin(design.id);
                      }}
                    />
                  )
                ) : (
                  <Text style={styles.soon}>
                    {t('skins.earnHow.perfect', { matches: WEEKEND_MATCHES })}
                  </Text>
                )}
              </Card>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /** Wider than a collection tile: it carries a sentence, not a countdown. */
  earnedCardWrap: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  notForSaleChip: {
    alignSelf: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    marginTop: 2,
  },
  notForSaleText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  filterButtonActive: {
    borderColor: colors.neon,
    backgroundColor: colors.neonFaint,
  },
  filterText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterTextActive: {
    color: colors.neon,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  skinCardWrap: {
    flex: 1,
  },
  skinCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  ballSwatchRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 4,
    backgroundColor: colors.backgroundElevated,
    marginBottom: spacing.xs,
  },
  ballSwatch: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  tableSwatch: {
    width: 72,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  tableSwatchLine: {
    height: 2,
    width: '70%',
    alignSelf: 'center',
    opacity: 0.8,
  },
  skinName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.textPrimary,
  },
  skinDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    minHeight: 28,
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equippedText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.neon,
  },
  // Three to a row rather than the two the balls use: a cup is tall and thin,
  // and the week's offer is three, so it wants to be one line.
  cupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cupCardWrap: {
    width: '31%',
    flexGrow: 1,
  },
  cupCard: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  cupCardDim: {
    opacity: 0.45,
  },
  cupSwatch: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    padding: spacing.xs,
    backgroundColor: colors.backgroundElevated,
  },
  rotation: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  note: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  soon: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: 6,
  },
});
