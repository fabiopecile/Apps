import { View, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

type MemberProfile = Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;

interface GroupAvatarProps {
  members: MemberProfile[];
  size?: number;
}

/**
 * Two overlapping member avatars, so a group is recognisable as one at a
 * glance in the chat list rather than looking like a chat with whichever
 * member happened to sort first.
 */
export function GroupAvatar({ members, size = 52 }: GroupAvatarProps) {
  const shown = members.slice(0, 2);
  const inner = size * 0.68;

  if (shown.length === 0) {
    return <View style={[styles.empty, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <View style={styles.back}>
        <Avatar uri={shown[0].avatar_url} name={shown[0].username} size={inner} />
      </View>
      {shown[1] ? (
        <View style={[styles.front, { borderRadius: inner / 2 + 2 }]}>
          <Avatar uri={shown[1].avatar_url} name={shown[1].username} size={inner} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { backgroundColor: colors.surface },
  back: { position: 'absolute', top: 0, right: 0 },
  front: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
