import { Image, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ringColor?: string;
}

export function Avatar({ uri, name, size = 44, ringColor }: AvatarProps) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  const ringStyle = ringColor
    ? { borderWidth: 2, borderColor: ringColor, padding: 2 }
    : undefined;

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, ringStyle]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: '100%', height: '100%', borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.textMuted,
    fontWeight: '700',
  },
});
