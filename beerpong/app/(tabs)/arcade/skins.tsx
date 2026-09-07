import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { Card } from '@/components/ui/Card';
import { GlowButton } from '@/components/ui/GlowButton';
import { BallArt } from '@/components/arcade/BallArt';
import { SKINS, type SkinType } from '@/lib/skins';
import { useBeerpongStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

export default function SkinsScreen() {
  const [filter, setFilter] = useState<SkinType>('ball');
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
          <View style={styles.coinChip}>
            <Ionicons name="logo-bitcoin" size={14} color={colors.gold} />
            <Text style={styles.coinText}>{coins}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['ball', 'table'] as SkinType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => setFilter(type)}
              style={[styles.filterButton, filter === type && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
                {type === 'ball' ? t('skins.balls') : t('skins.tables')}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={skins}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const owned = ownedSkinIds.includes(item.id);
            const equipped = equippedId === item.id;
            const canAfford = coins >= item.cost;

            return (
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
                    size="sm"
                    disabled={!canAfford}
                    onPress={() => buySkin(item.id)}
                  />
                )}
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
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
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 22,
    color: colors.textPrimary,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  coinText: {
    fontFamily: fonts.label,
    color: colors.gold,
    fontSize: 13,
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
});
