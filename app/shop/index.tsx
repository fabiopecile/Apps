import { useState, type ReactNode } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { Avatar } from '@/components/Avatar';
import { PopIn } from '@/components/PopIn';
import { CountUp } from '@/components/CountUp';
import { SuccessStamp } from '@/components/SuccessStamp';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { ShopItem } from '@/lib/database.types';

export default function ShopScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, ownedKeys, loading, buyItem, equipItem } = useShop();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchaseStamp, setPurchaseStamp] = useState(0);

  if (!profile) return null;

  const isEquipped = (item: ShopItem) =>
    item.kind === 'frame' ? profile.equipped_frame_color === item.value : profile.equipped_title === item.value;

  const handleAction = async (item: ShopItem) => {
    setBusyKey(item.key);
    setError(null);
    const owned = ownedKeys.has(item.key);
    const { error: actionError } = owned ? await equipItem(item.key) : await buyItem(item.key);
    setBusyKey(null);
    if (actionError) setError(actionError);
    else if (!owned) setPurchaseStamp((t) => t + 1);
  };

  const frames = items.filter((i) => i.kind === 'frame');
  const titles = items.filter((i) => i.kind === 'title');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SuccessStamp trigger={purchaseStamp} label="Gekauft!" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop</Text>
          <CountUp value={profile.coins} style={styles.coins} format={(n) => `${n} Coins`} />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'x'}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.buyCoinsCard} onPress={() => router.push('/shop/coins')}>
              <View style={styles.buyCoinsIcon}>
                <Ionicons name="ellipse" size={22} color={colors.gold} />
              </View>
              <View style={styles.buyCoinsText}>
                <Text style={styles.buyCoinsTitle}>Coins kaufen</Text>
                <Text style={styles.buyCoinsSubtitle}>Pakete ab 1,99 € – oder gratis am Glücksrad</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>

            <Text style={styles.sectionTitle}>Rahmen</Text>
            {frames.map((item, i) => (
              <PopIn key={item.key} variant="slide" delay={i * 55}>
                <ShopRow
                  item={item}
                  owned={ownedKeys.has(item.key)}
                  equipped={isEquipped(item)}
                  canAfford={profile.coins >= item.price}
                  busy={busyKey === item.key}
                  onAction={() => handleAction(item)}
                  preview={<Avatar uri={profile.avatar_url} name={profile.username} size={40} ringColor={item.value} />}
                />
              </PopIn>
            ))}

            <Text style={styles.sectionTitle}>Titel</Text>
            {titles.map((item, i) => (
              <PopIn key={item.key} variant="slide" delay={(frames.length + i) * 55}>
                <ShopRow
                  item={item}
                  owned={ownedKeys.has(item.key)}
                  equipped={isEquipped(item)}
                  canAfford={profile.coins >= item.price}
                  busy={busyKey === item.key}
                  onAction={() => handleAction(item)}
                  preview={
                    <View style={styles.titlePreview}>
                      <Ionicons name="ribbon" size={16} color={colors.gold} />
                    </View>
                  }
                />
              </PopIn>
            ))}

            {!loading && items.length === 0 ? <Text style={styles.error}>Shop ist gerade leer.</Text> : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function ShopRow({
  item,
  owned,
  equipped,
  canAfford,
  busy,
  onAction,
  preview,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  busy: boolean;
  onAction: () => void;
  preview: ReactNode;
}) {
  const buttonLabel = equipped ? 'Aktiv' : owned ? 'Anlegen' : `${item.price}`;
  const disabled = busy || equipped || (!owned && !canAfford);

  return (
    <View style={styles.row}>
      {preview}
      <Text style={styles.rowLabel}>{item.label}</Text>
      <Pressable
        style={[
          styles.buyButton,
          equipped && styles.buyButtonEquipped,
          !owned && !canAfford && styles.buyButtonDisabled,
        ]}
        onPress={onAction}
        disabled={disabled}
      >
        <Text style={[styles.buyButtonText, equipped && styles.buyButtonTextEquipped]}>
          {busy ? '...' : buttonLabel}
        </Text>
      </Pressable>
    </View>
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
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  coins: { color: colors.gold, fontWeight: '700', fontSize: fontSizes.sm, marginTop: 2 },
  content: { padding: spacing.lg },
  error: { color: colors.danger, fontSize: fontSizes.sm, marginBottom: spacing.md },
  sectionTitle: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  buyCoinsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  buyCoinsIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyCoinsText: { flex: 1 },
  buyCoinsTitle: { color: colors.gold, fontWeight: '800', fontSize: fontSizes.md },
  buyCoinsSubtitle: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { flex: 1, color: colors.text, fontWeight: '600', fontSize: fontSizes.sm },
  titlePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  buyButtonEquipped: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  buyButtonDisabled: { opacity: 0.4 },
  buyButtonText: { color: colors.gold, fontWeight: '700', fontSize: fontSizes.xs },
  buyButtonTextEquipped: { color: colors.textMuted },
});
