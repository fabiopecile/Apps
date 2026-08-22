import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, spacing } from '@/constants/theme';

interface StoryAvatarProps {
  uri?: string | null;
  name: string;
  frameColor?: string | null;
  isAddButton?: boolean;
  hasUnseen?: boolean;
  onPress?: () => void;
}

export function StoryAvatar({ uri, name, frameColor, isAddButton, hasUnseen, onPress }: StoryAvatarProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Avatar uri={uri} name={name} size={64} ringColor={frameColor ?? (hasUnseen ? colors.red : undefined)} />
      {isAddButton ? (
        <View style={styles.plusBadge}>
          <Text style={styles.plusText}>+</Text>
        </View>
      ) : null}
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 76, gap: spacing.xs },
  name: { color: colors.textMuted, fontSize: fontSizes.xs },
  plusBadge: {
    position: 'absolute',
    top: 22,
    left: 26,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { color: colors.black, fontWeight: '800', fontSize: 14, lineHeight: 16 },
});
