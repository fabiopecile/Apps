import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Language } from '@/lib/i18n';

interface LanguagePickerModalProps {
  visible: boolean;
  current: string;
  onSelect: (language: Language) => void;
  onClose: () => void;
}

const OPTIONS: { code: Language; labelKey: 'language.de' | 'language.en' }[] = [
  { code: 'de', labelKey: 'language.de' },
  { code: 'en', labelKey: 'language.en' },
];

export function LanguagePickerModal({ visible, current, onSelect, onClose }: LanguagePickerModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{t('language.title')}</Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.code}
              style={styles.option}
              onPress={() => {
                onSelect(option.code);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{t(option.labelKey)}</Text>
              {current === option.code ? <Ionicons name="checkmark" size={20} color={colors.red} /> : null}
            </Pressable>
          ))}
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
    padding: spacing.lg,
  },
  title: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '800', marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: fontSizes.md, fontWeight: '600' },
});
