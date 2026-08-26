import { useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Ad } from '@/lib/database.types';

interface AdCardProps {
  ad: Ad;
  onPress: () => void;
  onImpression: () => void;
}

/**
 * A sponsored post. Deliberately built from the same parts as PostCard - same
 * header, same image frame, same spacing - so it reads as part of the feed
 * rather than a banner pasted into it. The "Gesponsert" line is what keeps it
 * honest, and it is not optional.
 */
export function AdCard({ ad, onPress, onImpression }: AdCardProps) {
  useEffect(() => {
    onImpression();
  }, [onImpression]);

  const aspect = ad.image_aspect_ratio ?? 4 / 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={ad.advertiser_avatar_url} name={ad.advertiser_name} size={40} ringColor={colors.borderStrong} />
        <View style={styles.headerText}>
          <Text style={styles.advertiser}>{ad.advertiser_name}</Text>
          <Text style={styles.sponsored}>Gesponsert</Text>
        </View>
      </View>

      <Pressable onPress={onPress}>
        <Image source={{ uri: ad.image_url }} style={[styles.image, { aspectRatio: aspect }]} />
      </Pressable>

      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>{ad.cta_label}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text} />
      </Pressable>

      {ad.caption ? (
        <Text style={styles.caption}>
          <Text style={styles.advertiser}>{ad.advertiser_name} </Text>
          {ad.caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1 },
  advertiser: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  sponsored: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: 1 },
  image: { width: '100%', backgroundColor: colors.surface },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ctaText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  caption: {
    color: colors.text,
    fontSize: fontSizes.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
