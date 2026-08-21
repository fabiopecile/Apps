import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

export function LeaderboardRow({
  profile,
  rank,
  isMe,
  onPress,
}: {
  profile: Profile;
  rank: number;
  isMe: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.row, isMe && styles.rowMe]} onPress={onPress}>
      <Text style={styles.rank}>{rank}</Text>
      <Avatar
        uri={profile.avatar_url}
        name={profile.display_name ?? profile.username}
        size={36}
        ringColor={profile.equipped_frame_color ?? undefined}
      />
      <Text style={styles.name} numberOfLines={1}>
        {isMe ? 'DU' : profile.username}
      </Text>
      <Text style={styles.points}>{profile.points.toLocaleString('de-DE')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMe: { backgroundColor: colors.surface, borderRadius: radii.md },
  rank: { width: 24, color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.sm },
  name: { flex: 1, color: colors.text, fontWeight: '600', fontSize: fontSizes.sm },
  points: { color: colors.red, fontWeight: '700', fontSize: fontSizes.sm },
});
