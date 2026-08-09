import { useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { StatRow } from '@/components/StatPill';
import { SettingsRow } from '@/components/SettingsRow';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnPosts } from '@/hooks/useOwnPosts';
import { useBadges } from '@/hooks/useBadges';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { XP_PER_LEVEL } from '@/constants/game';

type ProfileTab = 'beitraege' | 'statistik' | 'badges';

export default function ProfilScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>('beitraege');
  const { posts } = useOwnPosts(session?.user.id);
  const { allBadges, earnedIds } = useBadges(session?.user.id);

  if (!profile) return null;

  const quote = profile.tips_count > 0 ? Math.round((profile.correct_tips_count / profile.tips_count) * 100) : 0;
  const xpInLevel = profile.xp % XP_PER_LEVEL;

  const updateSetting = async (patch: Partial<{ dark_mode: boolean; notifications_enabled: boolean }>) => {
    await supabase.from('profiles').update(patch).eq('id', profile.id);
    await refreshProfile();
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
              <Avatar uri={profile.avatar_url} name={profile.display_name ?? profile.username} size={88} ringColor={colors.red} />
              <View style={styles.profileInfo}>
                <Text style={styles.username}>{profile.username}</Text>
                <View style={styles.levelRow}>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelText}>LVL {profile.level}</Text>
                  </View>
                  <View style={styles.xpBarTrack}>
                    <View style={[styles.xpBarFill, { width: `${Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)}%` }]} />
                  </View>
                  <Text style={styles.xpText}>
                    {xpInLevel}/{XP_PER_LEVEL} XP
                  </Text>
                </View>
              </View>
            </View>

            <StatRow
              stats={[
                { value: String(profile.tips_count), label: 'Tipps' },
                { value: `${quote}%`, label: 'Quote' },
                { value: profile.points.toLocaleString('de-DE'), label: 'Punkte', accent: true },
              ]}
            />

            <View style={styles.settings}>
              <SettingsRow icon="🌙" label="Dark Mode" value={profile.dark_mode} onValueChange={(v) => updateSetting({ dark_mode: v })} />
              <SettingsRow icon="🌐" label="Sprache" trailingText={profile.language.toUpperCase()} chevron />
              <SettingsRow
                icon="🔔"
                label="Benachrichtigungen"
                value={profile.notifications_enabled}
                onValueChange={(v) => updateSetting({ notifications_enabled: v })}
              />
              <SettingsRow icon="🛡️" label="Datenschutz" chevron onPress={() => {}} />
            </View>

            <View style={styles.tabs}>
              <TabButton label="BEITRÄGE" active={tab === 'beitraege'} onPress={() => setTab('beitraege')} />
              <TabButton label="STATISTIK" active={tab === 'statistik'} onPress={() => setTab('statistik')} />
              <TabButton label="BADGES" active={tab === 'badges'} onPress={() => setTab('badges')} />
            </View>

            {tab === 'statistik' ? (
              <View style={styles.statsDetail}>
                <StatDetailRow label="Tipps abgegeben" value={String(profile.tips_count)} />
                <StatDetailRow label="Richtige Tipps" value={String(profile.correct_tips_count)} />
                <StatDetailRow label="Trefferquote" value={`${quote}%`} />
                <StatDetailRow label="Gesamtpunkte" value={profile.points.toLocaleString('de-DE')} />
                <StatDetailRow label="Level" value={String(profile.level)} />
              </View>
            ) : null}

            {tab === 'badges' ? (
              <View style={styles.badgeGrid}>
                {allBadges.map((badge) => {
                  const earned = earnedIds.has(badge.id);
                  return (
                    <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                      <Text style={styles.badgeIcon}>{earned ? '🏅' : '🔒'}</Text>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </View>
                  );
                })}
                {allBadges.length === 0 ? <EmptyState title="Noch keine Badges verfügbar" /> : null}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.gridImage} />
          ) : (
            <View style={[styles.gridImage, styles.gridImageFallback]}>
              <Text>⚽️</Text>
            </View>
          )
        }
        ListEmptyComponent={tab === 'beitraege' ? <EmptyState title="Noch keine Beiträge" /> : null}
        ListFooterComponent={
          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Abmelden</Text>
          </Pressable>
        }
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
  username: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelPill: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.borderStrong },
  levelText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.xs },
  xpBarTrack: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: colors.blue },
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
  badgeIcon: { fontSize: 28 },
  badgeName: { color: colors.text, fontSize: fontSizes.xs, textAlign: 'center' },
  signOut: { margin: spacing.lg, padding: spacing.md, alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderStrong },
  signOutText: { color: colors.danger, fontWeight: '700' },
});
