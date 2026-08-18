import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { XP_PER_LEVEL, LEVEL_UP_REWARD_JOKERS } from '@/constants/game';

interface LevelProgressModalProps {
  visible: boolean;
  level: number;
  xp: number;
  onClose: () => void;
}

export function LevelProgressModal({ visible, level, xp, onClose }: LevelProgressModalProps) {
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpMissing = XP_PER_LEVEL - xpInLevel;
  const progress = Math.min(1, xpInLevel / XP_PER_LEVEL);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.badge}>LVL {level}</Text>
          <Text style={styles.title}>Noch {xpMissing} XP bis Level {level + 1}</Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.xpText}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>

          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>⚡ Nächste Belohnung: +{LEVEL_UP_REWARD_JOKERS} Joker</Text>
          </View>

          <PrimaryButton label="Alles klar" onPress={onClose} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    alignItems: 'center',
  },
  badge: { color: colors.blue, fontWeight: '900', fontSize: fontSizes.sm, marginBottom: spacing.sm },
  title: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.blue, borderRadius: radii.pill },
  xpText: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs, marginBottom: spacing.lg },
  rewardPill: {
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  rewardText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  button: { width: '100%' },
});
