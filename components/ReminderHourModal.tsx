import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

const LOCAL_HOUR_OPTIONS = [8, 12, 15, 18, 20, 22];

interface ReminderHourModalProps {
  visible: boolean;
  currentUtcHour: number | null;
  onSelect: (utcHour: number) => void;
  onClose: () => void;
}

// profiles.reminder_hour_utc is stored in UTC (the reminder cron runs
// hourly and compares against it directly). The picker itself shows hours
// in the device's local time so "20 Uhr" means 20:00 wherever the user is.
const localOffsetHours = () => -(new Date().getTimezoneOffset() / 60);

export function ReminderHourModal({ visible, currentUtcHour, onSelect, onClose }: ReminderHourModalProps) {
  const offset = localOffsetHours();
  const currentLocalHour = currentUtcHour === null ? 18 + offset : currentUtcHour + offset;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Erinnerungszeit (Glücksrad)</Text>
          {LOCAL_HOUR_OPTIONS.map((hour) => {
            const isSelected = ((currentLocalHour % 24) + 24) % 24 === hour;
            return (
              <Pressable
                key={hour}
                style={styles.option}
                onPress={() => {
                  const utcHour = (((hour - offset) % 24) + 24) % 24;
                  onSelect(Math.round(utcHour));
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{hour}:00 Uhr</Text>
                {isSelected ? <Ionicons name="checkmark" size={20} color={colors.red} /> : null}
              </Pressable>
            );
          })}
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
