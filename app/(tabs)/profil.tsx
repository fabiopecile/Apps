import { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { StatRow } from '@/components/StatPill';
import { SettingsRow } from '@/components/SettingsRow';
import { EmptyState } from '@/components/EmptyState';
import { InviteFriendsCard } from '@/components/InviteFriendsCard';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { ProCard } from '@/components/ProCard';
import { ReminderHourModal, formatLocalHour } from '@/components/ReminderHourModal';
import { AnimatedBar } from '@/components/AnimatedBar';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnPosts } from '@/hooks/useOwnPosts';
import { useBadges } from '@/hooks/useBadges';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { confirmDestructive } from '@/lib/confirm';
import { registerForPushNotifications, clearPushToken } from '@/lib/notifications';
import { exportStatsPdf } from '@/lib/statsExport';
import type { Language } from '@/lib/i18n';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { XP_PER_LEVEL } from '@/constants/game';
import { hasPro } from '@/lib/pro';

type ProfileTab = 'beitraege' | 'statistik' | 'badges';

export default function ProfilScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>('beitraege');
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [reminderHourOpen, setReminderHourOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { posts, refresh: refreshPosts } = useOwnPosts(session?.user.id);
  const { allBadges, earnedIds } = useBadges(session?.user.id);

  // Coming back from "Neuer Beitrag" or the Shop doesn't remount this screen,
  // so re-fetch on focus to show what just changed.
  useFocusEffect(
    useCallback(() => {
      refreshPosts();
      refreshProfile();
    }, [refreshPosts, refreshProfile])
  );

  if (!profile) return null;

  const isPro = hasPro(profile);

  const quote = profile.tips_count > 0 ? Math.round((profile.correct_tips_count / profile.tips_count) * 100) : 0;
  const xpInLevel = profile.xp % XP_PER_LEVEL;

  const updateSetting = async (patch: Partial<{ notifications_enabled: boolean; language: Language }>) => {
    await supabase.from('profiles').update(patch).eq('id', profile.id);
    await refreshProfile();
  };

  const handleReminderHourSelect = async (utcHour: number) => {
    await supabase.from('profiles').update({ reminder_hour_utc: utcHour }).eq('id', profile.id);
    await refreshProfile();
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    await exportStatsPdf(profile, quote);
    setExportingPdf(false);
  };

  const handleDeleteAccount = () => {
    confirmDestructive(
      'Konto löschen?',
      'Dein Konto, deine Beiträge, Storys und Punkte werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.',
      'Endgültig löschen',
      async () => {
        setDeleteError(null);
        const { error } = await supabase.rpc('delete_own_account');
        if (error) {
          setDeleteError(error.message);
          return;
        }
        await signOut();
      }
    );
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    await updateSetting({ notifications_enabled: enabled });
    if (enabled) await registerForPushNotifications(profile.id);
    else await clearPushToken(profile.id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={tab === 'beitraege' ? posts : []}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View>
            <View style={styles.profileHeader}>
              <Avatar
                uri={profile.avatar_url}
                name={profile.display_name ?? profile.username}
                size={88}
                ringColor={profile.equipped_frame_color ?? (isPro ? colors.gold : colors.red)}
              />
              <View style={styles.profileInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>{profile.username}</Text>
                  {isPro ? (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  ) : null}
                  {profile.equipped_title ? (
                    <View style={styles.titleBadge}>
                      <Ionicons name="ribbon" size={11} color={colors.gold} />
                      <Text style={styles.titleBadgeText}>{profile.equipped_title}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.levelRow}>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelText}>LVL {profile.level}</Text>
                  </View>
                  <AnimatedBar
                    progress={xpInLevel / XP_PER_LEVEL}
                    color={colors.blue}
                    trackStyle={styles.xpBarTrack}
                  />
                  <Text style={styles.xpText}>
                    {xpInLevel}/{XP_PER_LEVEL} XP
                  </Text>
                </View>
              </View>
            </View>

            {profile.display_name || profile.bio ? (
              <View style={styles.aboutBlock}>
                {profile.display_name ? <Text style={styles.displayName}>{profile.display_name}</Text> : null}
                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              </View>
            ) : null}

            <Pressable style={styles.editButton} onPress={() => router.push('/profile/edit')}>
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={styles.editButtonText}>{t('settings.editProfile')}</Text>
            </Pressable>

            <StatRow
              stats={[
                { value: String(profile.tips_count), label: t('profil.statTipps') },
                { value: `${quote}%`, label: t('profil.statQuote') },
                { value: profile.points.toLocaleString('de-DE'), label: t('profil.statPoints'), accent: true },
                {
                  value: String(profile.coins),
                  label: t('profil.statCoins'),
                  icon: 'ellipse',
                  iconColor: colors.gold,
                },
              ]}
            />

            <ProCard isPro={isPro} />

            {/* Only for granted Pro - a paying subscription has no end date to show. */}
            {!profile.is_pro && profile.pro_until && new Date(profile.pro_until) > new Date() ? (
              <Text style={styles.proUntil}>
                Dein Pro läuft bis {new Date(profile.pro_until).toLocaleDateString('de-AT')}
              </Text>
            ) : null}

            <InviteFriendsCard referralCode={profile.referral_code} />

            <View style={styles.settings}>
              <SettingsRow icon="bag-outline" label={t('settings.shop')} trailingText={`${profile.coins} Coins`} chevron onPress={() => router.push('/shop')} />
              <SettingsRow icon="ellipse-outline" label={t('settings.buyCoins')} chevron onPress={() => router.push('/shop/coins')} />
            </View>

            {isPro ? (
              <View style={styles.settings}>
                <SettingsRow icon="trophy-outline" label={t('settings.privateLeagues')} chevron onPress={() => router.push('/leagues')} />
                <SettingsRow
                  icon="time-outline"
                  label={t('settings.reminderTime')}
                  trailingText={`${formatLocalHour(profile.reminder_hour_utc)}:00`}
                  chevron
                  onPress={() => setReminderHourOpen(true)}
                />
                <SettingsRow
                  icon="document-text-outline"
                  label={exportingPdf ? t('settings.exportingStats') : t('settings.exportStats')}
                  chevron
                  onPress={handleExportPdf}
                />
              </View>
            ) : null}

            <View style={styles.settings}>
              <SettingsRow
                icon="language-outline"
                label={t('profil.language')}
                trailingText={profile.language.toUpperCase()}
                chevron
                onPress={() => setLanguagePickerOpen(true)}
              />
              <SettingsRow
                icon="notifications-outline"
                label={t('profil.notifications')}
                value={profile.notifications_enabled}
                onValueChange={handleNotificationsToggle}
              />
              <SettingsRow
                icon="help-circle-outline"
                label={t('settings.rules')}
                chevron
                onPress={() => router.push('/rules')}
              />
              <SettingsRow
                icon="key-outline"
                label={t('settings.changePassword')}
                chevron
                onPress={() => router.push('/reset-password')}
              />
              <SettingsRow
                icon="ban-outline"
                label={t('settings.blockedUsers')}
                chevron
                onPress={() => router.push('/profile/blocked')}
              />
              <SettingsRow icon="shield-checkmark-outline" label={t('profil.privacy')} chevron onPress={() => router.push('/privacy')} />
              <SettingsRow
                icon="document-text-outline"
                label={t('settings.terms')}
                chevron
                onPress={() => router.push('/terms')}
              />
              {profile.is_admin ? (
                <SettingsRow icon="construct-outline" label={t('settings.admin')} chevron onPress={() => router.push('/admin')} />
              ) : null}
            </View>

            <View style={styles.tabs}>
              <TabButton label={t('profil.tabPosts')} active={tab === 'beitraege'} onPress={() => setTab('beitraege')} />
              <TabButton label={t('profil.tabStats')} active={tab === 'statistik'} onPress={() => setTab('statistik')} />
              <TabButton label={t('profil.tabBadges')} active={tab === 'badges'} onPress={() => setTab('badges')} />
            </View>

            {tab === 'statistik' ? (
              <View style={styles.statsDetail}>
                <StatDetailRow label={t('profil.tippsAbgegeben')} value={String(profile.tips_count)} />
                <StatDetailRow label={t('profil.richtigeTipps')} value={String(profile.correct_tips_count)} />
                <StatDetailRow label={t('profil.trefferquote')} value={`${quote}%`} />
                <StatDetailRow label={t('profil.gesamtpunkte')} value={profile.points.toLocaleString('de-DE')} />
                <StatDetailRow label={t('profil.level')} value={String(profile.level)} />
              </View>
            ) : null}

            {tab === 'badges' ? (
              <View style={styles.badgeGrid}>
                {allBadges.map((badge) => {
                  const earned = earnedIds.has(badge.id);
                  return (
                    <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                      <Ionicons
                        name={earned ? 'medal' : 'lock-closed'}
                        size={24}
                        color={earned ? colors.gold : colors.textFaint}
                      />
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </View>
                  );
                })}
                {allBadges.length === 0 ? <EmptyState title={t('profil.noBadges')} /> : null}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.gridImage} />
          ) : (
            <View style={[styles.gridImage, styles.gridImageFallback]}>
              <Ionicons name="football-outline" size={20} color={colors.textFaint} />
            </View>
          )
        }
        ListEmptyComponent={tab === 'beitraege' ? <EmptyState title={t('profil.noPosts')} /> : null}
        ListFooterComponent={
          <View>
            <Pressable style={styles.signOut} onPress={signOut}>
              <Text style={styles.signOutText}>{t('profil.signOut')}</Text>
            </Pressable>
            {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
            <Pressable style={styles.deleteAccount} onPress={handleDeleteAccount}>
              <Text style={styles.deleteAccountText}>{t('settings.deleteAccount')}</Text>
            </Pressable>
          </View>
        }
      />

      <LanguagePickerModal
        visible={languagePickerOpen}
        current={profile.language}
        onSelect={(language) => updateSetting({ language })}
        onClose={() => setLanguagePickerOpen(false)}
      />
      <ReminderHourModal
        visible={reminderHourOpen}
        currentUtcHour={profile.reminder_hour_utc}
        onSelect={handleReminderHourSelect}
        onClose={() => setReminderHourOpen(false)}
      />
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statDetailRow}>
      <Text style={styles.statDetailLabel}>{label}</Text>
      <Text style={styles.statDetailValue}>{value}</Text>
    </View>
  );
}

const GRID_GAP = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  profileInfo: { flex: 1, gap: spacing.sm },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  username: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.4 },
  proBadge: { backgroundColor: colors.gold, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  proBadgeText: { color: colors.black, fontSize: fontSizes.xs, fontWeight: '800' },
  titleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.goldDark, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  titleBadgeText: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '700' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelPill: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.borderStrong },
  levelText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.xs },
  xpBarTrack: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  xpText: { color: colors.textMuted, fontSize: 10 },
  settings: { marginTop: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tabs: { flexDirection: 'row', marginTop: spacing.lg },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.red },
  tabButtonText: { color: colors.textFaint, fontWeight: '700', fontSize: fontSizes.xs },
  tabButtonTextActive: { color: colors.white },
  gridImage: { flex: 1 / 3, aspectRatio: 1, margin: GRID_GAP, backgroundColor: colors.surface },
  gridImageFallback: { alignItems: 'center', justifyContent: 'center' },
  statsDetail: { padding: spacing.lg, gap: spacing.md },
  statDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  statDetailLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  statDetailValue: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg, gap: spacing.md },
  badgeCard: { width: '30%', backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', padding: spacing.md, gap: spacing.xs },
  badgeCardLocked: { opacity: 0.4 },
  badgeName: { color: colors.text, fontSize: fontSizes.xs, textAlign: 'center' },
  signOut: { margin: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderStrong },
  signOutText: { color: colors.danger, fontWeight: '700' },
  deleteError: { color: colors.danger, fontSize: fontSizes.xs, textAlign: 'center', paddingHorizontal: spacing.lg },
  deleteAccount: { paddingVertical: spacing.md, marginBottom: spacing.xl, alignItems: 'center' },
  deleteAccountText: { color: colors.textFaint, fontSize: fontSizes.xs, textDecorationLine: 'underline' },
  proUntil: {
    color: colors.gold,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  aboutBlock: { paddingHorizontal: spacing.lg, gap: 2 },
  displayName: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  bio: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 19 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  editButtonText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
});
