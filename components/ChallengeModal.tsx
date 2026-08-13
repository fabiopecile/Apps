import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { DuelType } from '@/lib/database.types';

const CHALLENGE_OPTIONS: { type: DuelType; emoji: string; title: string; desc: string; colorStart: string; colorEnd: string }[] = [
  { type: 'tips', emoji: '🎯', title: 'Tipp-Duell', desc: 'Wer tippt mehr Spiele richtig?', colorStart: colors.blueDark, colorEnd: colors.blue },
  { type: 'xp', emoji: '🏆', title: 'Punktewettkampf', desc: 'Wer sammelt mehr XP?', colorStart: '#4c1d95', colorEnd: '#7c3aed' },
  { type: 'streak', emoji: '🔥', title: 'Streak-Battle', desc: 'Wer hat die längste Serie?', colorStart: colors.goldDark, colorEnd: colors.gold },
];

interface ChallengeModalProps {
  visible: boolean;
  recipientName: string;
  onClose: () => void;
  onSelect: (type: DuelType) => void;
}

export function ChallengeModal({ visible, recipientName, onClose, onSelect }: ChallengeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Challenge senden</Text>
          <Text style={styles.subtitle}>
            Fordere <Text style={styles.recipient}>{recipientName}</Text> zu einem Duell heraus!
          </Text>

          {CHALLENGE_OPTIONS.map((option) => (
            <Pressable
              key={option.type}
              style={[styles.option, { backgroundColor: option.colorStart, borderColor: option.colorEnd }]}
              onPress={() => onSelect(option.type)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDesc}>{option.desc}</Text>
              </View>
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  title: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '900', textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.xl },
  recipient: { color: colors.white, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionEmoji: { fontSize: 26 },
  optionText: { flex: 1 },
  optionTitle: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  optionDesc: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.xs, marginTop: 2 },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderStrong, marginTop: spacing.xs },
  cancelText: { color: colors.textMuted, fontWeight: '700' },
});
