import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

const ORDER = [1, 0, 2]; // render 2nd, 1st, 3rd like a podium

export function LeaderboardPodium({ top3, currentUserId }: { top3: Profile[]; currentUserId?: string }) {
  return (
    <View style={styles.row}>
      {ORDER.map((idx) => {
        const profile = top3[idx];
        if (!profile) return <View key={idx} style={styles.slot} />;
        const rank = idx + 1;
        const isMe = profile.id === currentUserId;
        return (
          <View key={profile.id} style={[styles.slot, rank === 1 && styles.slotFirst]}>
            {rank === 1 ? <Text style={styles.crown}>👑</Text> : null}
            <Avatar
              uri={profile.avatar_url}
              name={profile.display_name ?? profile.username}
              size={rank === 1 ? 72 : 56}
              ringColor={rank === 1 ? colors.red : colors.borderStrong}
            />
            <View style={[styles.rankCard, rank === 1 && styles.rankCardFirst]}>
              <Text style={[styles.rankNumber, rank === 1 && styles.rankNumberFirst]}>{rank}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {isMe ? 'DU' : profile.username}
            </Text>
            <Text style={styles.points}>{profile.points.toLocaleString('de-DE')}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  slot: { alignItems: 'center', width: 96, gap: spacing.xs },
  slotFirst: { marginBottom: spacing.md },
  crown: { fontSize: 22, marginBottom: -4 },
  rankCard: {
    width: 96,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.md,
  },
  rankCardFirst: { height: 96, borderColor: colors.red },
  rankNumber: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.textMuted },
  rankNumberFirst: { color: colors.red },
  name: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  points: { color: colors.red, fontWeight: '700', fontSize: fontSizes.sm },
});
