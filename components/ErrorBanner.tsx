import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
}

/**
 * Shown when a fetch fails. Without it a network error looks identical to
 * "there's nothing here yet", which is the more alarming of the two readings.
 */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  // Before the early return - a hook must run on every render.
  const { t } = useTranslation();
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
      <View style={styles.text}>
        <Text style={styles.title}>{t('common.offline')}</Text>
        <Text style={styles.detail} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry} hitSlop={6}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  text: { flex: 1 },
  title: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  detail: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 1 },
  retry: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  retryText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.xs },
});
