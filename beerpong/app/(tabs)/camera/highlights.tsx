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
import {
  REEL_CLIPS,
  REEL_SUPPORTED,
  buildReel,
  estimateReelSeconds,
  type ReelProgress,
  type ReelResult,
} from '@/lib/reel';
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
  /** The reel being made, and then the reel. */
  const [building, setBuilding] = useState<ReelProgress | null>(null);
  const [reel, setReel] = useState<ReelResult | null>(null);
  const [reelFailed, setReelFailed] = useState(false);

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
    setReel(null);
    reload();
  };

  /**
   * Cutting the reel takes as long as the reel runs — it is made by playing the
   * clips through and re-recording them, which is the only way to get one real
   * file out of several (see `lib/reel.web.ts`). So the button says how long it
   * will take before it is pressed, and the wait counts through the clips
   * rather than showing a spinner.
   */
  const makeReel = async () => {
    feedback.tap();
    setReelFailed(false);
    setReel(null);
    setBuilding({ done: 0, clip: 1, of: Math.min(clips.length, REEL_CLIPS) });
    try {
      const made = await buildReel({
        title: t('reel.cardTitle'),
        subtitle: formatWhen(Date.now()),
        onProgress: setBuilding,
      });
      if (made) {
        setReel(made);
        feedback.reward();
      } else {
        setReelFailed(true);
      }
    } catch {
      setReelFailed(true);
    } finally {
      setBuilding(null);
    }
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
              {REEL_SUPPORTED ? (
                <View style={styles.reelCard}>
                  <Text style={styles.reelTitle}>{t('reel.title')}</Text>
                  <Text style={styles.body}>
                    {t('reel.body', {
                      clips: Math.min(clips.length, REEL_CLIPS),
                      seconds: estimateReelSeconds(clips.length),
                    })}
                  </Text>

                  {reel ? (
                    <>
                      <Video
                        source={{ uri: reel.url }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                      />
                      <Text style={styles.clipMeta}>
                        {t('highlights.clip', {
                          seconds: reel.seconds,
                          size: formatSize(reel.size),
                        })}
                      </Text>
                      <Text style={styles.body}>{t('reel.saveHow', { name: reel.filename })}</Text>
                      <GlowButton
                        label={t('reel.again')}
                        variant="outline"
                        size="sm"
                        onPress={makeReel}
                      />
                    </>
                  ) : building ? (
                    <>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.round(building.done * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.clipMeta}>
                        {t('reel.building', { clip: building.clip, of: building.of })}
                      </Text>
                    </>
                  ) : (
                    <GlowButton label={t('reel.make')} size="sm" onPress={makeReel} />
                  )}

                  {reelFailed ? <Text style={styles.failed}>{t('reel.failed')}</Text> : null}
                </View>
              ) : null}

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
  reelCard: {
    borderWidth: 1.5,
    borderColor: colors.neon,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reelTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: colors.neon },
  failed: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.danger },
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
