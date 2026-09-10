import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import {
  HIGHLIGHTS_SUPPORTED,
  HIGHLIGHT_LIMIT,
  clearHighlights,
  deleteHighlight,
  formatSize,
  listHighlights,
  type HighlightClip,
} from '@/lib/highlights';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * The clips the camera kept.
 *
 * Nothing here leaves the device: the list is read straight out of the
 * browser's own storage, and the only actions are watch and delete.
 */
export default function HighlightsScreen() {
  const t = useT();
  const feedback = useFeedback();
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setClips(await listHighlights());
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = async (id: string) => {
    feedback.tap();
    await deleteHighlight(id);
    reload();
  };

  const removeAll = async () => {
    feedback.tap();
    await clearHighlights();
    reload();
  };

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('highlights.title')}</Text>
          {clips.length > 0 ? (
            <Pressable onPress={removeAll} hitSlop={10}>
              <Ionicons name="trash" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!HIGHLIGHTS_SUPPORTED ? (
            <View style={styles.card}>
              <Ionicons name="videocam-off" size={26} color={colors.textSecondary} />
              <Text style={styles.body}>{t('highlights.unsupported')}</Text>
            </View>
          ) : clips.length === 0 ? (
            <View style={styles.card}>
              <Ionicons name="film-outline" size={26} color={colors.textSecondary} />
              <Text style={styles.body}>{loaded ? t('highlights.empty') : ''}</Text>
              <GlowButton
                label={t('tab.camera')}
                size="sm"
                variant="outline"
                onPress={() => router.back()}
              />
            </View>
          ) : (
            <>
              <Text style={styles.count}>
                {t('highlights.count', { count: clips.length, max: HIGHLIGHT_LIMIT })}
              </Text>
              {clips.map((clip) => (
                <View key={clip.id} style={styles.clipCard}>
                  <Video
                    source={{ uri: clip.url }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                  />
                  <View style={styles.clipRow}>
                    <Text style={styles.clipMeta} selectable={false}>
                      {formatWhen(clip.at)} · {t('highlights.clip', {
                        seconds: clip.seconds,
                        size: formatSize(clip.size),
                      })}
                    </Text>
                    <Pressable onPress={() => remove(clip.id)} hitSlop={8} style={styles.deleteRow}>
                      <Ionicons name="trash-outline" size={15} color={colors.textSecondary} />
                      <Text style={styles.deleteText} selectable={false}>
                        {t('highlights.delete')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={styles.note}>{t('highlights.note')}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Time of day, which is all anybody needs to find the throw they remember. */
function formatWhen(at: number): string {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  count: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  clipCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  video: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
  },
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clipMeta: { fontFamily: fonts.label, fontSize: 12, color: colors.textSecondary },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { fontFamily: fonts.label, fontSize: 12, color: colors.textSecondary },
  note: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
