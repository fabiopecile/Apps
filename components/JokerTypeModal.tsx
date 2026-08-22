import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { JokerType } from '@/lib/database.types';

const JOKER_OPTIONS: { type: JokerType; emoji: string; title: string; desc: string }[] = [
  { type: 'risk', emoji: '🎲', title: 'Risiko Joker', desc: '±50% Punkte bei richtigem Tipp' },
  { type: 'boost', emoji: '⚡', title: 'Boost Joker', desc: '×2 Punkte bei richtigem Tipp' },
  { type: 'safe', emoji: '🛡️', title: 'Sicher Joker', desc: 'Mindestens 1 Punkt, auch bei falschem Tipp' },
];

interface JokerTypeModalProps {
  visible: boolean;
  jokersRemaining: number;
  currentType: JokerType | null;
  onClose: () => void;
  onConfirm: (type: JokerType) => void;
  onRemove: () => void;
}

export function JokerTypeModal({ visible, jokersRemaining, currentType, onClose, onConfirm, onRemove }: JokerTypeModalProps) {
  const [selected, setSelected] = useState<JokerType | null>(currentType);

  useEffect(() => {
    if (visible) setSelected(currentType);
  }, [visible, currentType]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Joker wählen</Text>
              <Text style={styles.subtitle}>
                {currentType ? 'Joker ändern oder entfernen' : `Noch ${jokersRemaining} Joker verfügbar`}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {JOKER_OPTIONS.map((option) => {
            const isSelected = selected === option.type;
            return (
              <Pressable
                key={option.type}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setSelected(option.type)}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                </View>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                  {isSelected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
              </Pressable>
            );
          })}

          <PrimaryButton
            label="Joker aktivieren"
            variant="red"
            disabled={!selected}
            onPress={() => selected && onConfirm(selected)}
            style={styles.confirmButton}
          />

          {currentType ? (
            <Pressable onPress={onRemove} style={styles.removeButton}>
              <Text style={styles.removeText}>Joker entfernen</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionSelected: { borderColor: colors.red, backgroundColor: colors.redDark + '22' },
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1 },
  optionTitle: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  optionDesc: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: colors.red, borderColor: colors.red },
  confirmButton: { marginTop: spacing.sm },
  removeButton: { alignItems: 'center', marginTop: spacing.lg },
  removeText: { color: colors.danger, fontWeight: '600', fontSize: fontSizes.sm },
});
