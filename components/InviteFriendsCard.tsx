import { View, Text, Pressable, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReferrals } from '@/hooks/useReferrals';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { REFERRAL_REWARD_XP, REFERRAL_REWARD_JOKER } from '@/constants/game';

export function InviteFriendsCard({ referralCode }: { referralCode: string }) {
  const { count } = useReferrals();
  const { t } = useTranslation();

  const handleShare = () => {
    Share.share({
      message: `Tritt mir bei TeamUp11 bei ⚽️ Nutze meinen Einladungscode ${referralCode} bei der Registrierung!`,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="people" size={20} color={colors.gold} />
        <Text style={styles.title}>{t('invite.title')}</Text>
      </View>
      <Text style={styles.subtitle}>
        {t('invite.subtitle', { xp: REFERRAL_REWARD_XP, joker: REFERRAL_REWARD_JOKER })}
      </Text>

      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>{t('invite.codeLabel')}</Text>
        <Text style={styles.code}>{referralCode}</Text>
      </View>

      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={16} color={colors.white} />
        <Text style={styles.shareText}>{t('invite.share')}</Text>
      </Pressable>

      <Text style={styles.count}>{count} {count === 1 ? t('invite.countOne') : t('invite.countMany')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.md },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  codeLabel: { color: colors.textFaint, fontSize: fontSizes.xs },
  code: { color: colors.gold, fontWeight: '900', fontSize: fontSizes.lg, letterSpacing: 2 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  shareText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  count: { color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' },
});
