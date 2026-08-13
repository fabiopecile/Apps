import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { WheelSpinResult } from '@/lib/database.types';

const PRIZE_EMOJI: Record<WheelSpinResult['prize_type'], string> = {
  xp: '⭐',
  joker: '🎁',
  coins: '🪙',
  booster: '🚀',
  title: '👑',
};

export function PrizePopup({ result, onClose }: { result: WheelSpinResult | null; onClose: () => void }) {
  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.icon}>{result ? PRIZE_EMOJI[result.prize_type] : '🎉'}</Text>
          <Text style={styles.title}>GEWONNEN!</Text>
          <Text style={styles.desc}>
            {result?.prize_type === 'title'
              ? `Du hast den Titel "${result.prize_label}" freigeschaltet`
              : `Du hast ${result?.prize_label} erhalten`}
          </Text>
          <PrimaryButton label="SUPER!" onPress={onClose} variant="red" style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.red,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  icon: { fontSize: 64, marginBottom: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '900', marginBottom: spacing.sm },
  desc: { color: colors.textMuted, fontSize: fontSizes.md, textAlign: 'center', marginBottom: spacing.xl },
  button: { width: '100%' },
});
