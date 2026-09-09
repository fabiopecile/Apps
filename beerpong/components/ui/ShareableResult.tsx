import { forwardRef, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { GlowButton } from './GlowButton';
import { LogoMark } from './LogoMark';
import { useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

export interface ShareCardData {
  headline: string;
  subline: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}

/**
 * The off-screen card that gets rasterised for sharing. Rendered at a fixed
 * size so the exported image looks the same on every device.
 */
const ShareCard = forwardRef<View, { data: ShareCardData; footer: string }>(
  ({ data, footer }, ref) => (
  <View ref={ref} style={styles.card} collapsable={false}>
    <View style={styles.cardHeader}>
      <LogoMark size={46} />
      <Text style={styles.brand}>BEERPONG</Text>
    </View>

    <Text style={styles.headline}>{data.headline}</Text>
    <Text style={styles.subline}>{data.subline}</Text>

    <View style={styles.scoreRow}>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreValue}>{data.leftValue}</Text>
        <Text style={styles.scoreLabel}>{data.leftLabel}</Text>
      </View>
      <Text style={styles.vs}>VS</Text>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreValue}>{data.rightValue}</Text>
        <Text style={styles.scoreLabel}>{data.rightLabel}</Text>
      </View>
    </View>

    <Text style={styles.footer}>{footer}</Text>
  </View>
  )
);
ShareCard.displayName = 'ShareCard';

/**
 * A share button plus the hidden card it exports. Kept together so callers
 * only pass the numbers and get the whole flow.
 */
export function ShareResultButton({ data, label }: { data: ShareCardData; label?: string }) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('share.button'),
        });
      }
    } catch {
      // Sharing can be unavailable (web, denied permission) — fail quietly.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Rendered off-screen purely so it can be captured. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot>
          <ShareCard ref={cardRef} data={data} footer={t('share.footer')} />
        </ViewShot>
      </View>
      <GlowButton
        label={label ?? t('share.button')}
        variant="outline"
        size="sm"
        onPress={share}
        disabled={busy || Platform.OS === 'web'}
        style={styles.button}
      />
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -2000,
    top: 0,
  },
  card: {
    width: 540,
    padding: 44,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.neon,
    borderRadius: 28,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  brand: {
    fontFamily: fonts.displayBlack,
    fontSize: 22,
    color: colors.neon,
    letterSpacing: 4,
  },
  headline: {
    fontFamily: fonts.headingBlack,
    fontSize: 40,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginTop: 34,
  },
  scoreBlock: {
    alignItems: 'center',
    minWidth: 150,
  },
  scoreValue: {
    fontFamily: fonts.numeric,
    fontSize: 68,
    color: colors.neon,
  },
  scoreLabel: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  vs: {
    fontFamily: fonts.headingBlack,
    fontSize: 20,
    color: colors.textMuted,
  },
  footer: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 34,
  },
  button: {
    width: '100%',
  },
});
