import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { QrCode } from '@/components/ui/QrCode';
import { ONLINE_AVAILABLE } from '@/lib/onlineConfig';
import { makePartyCode, type PartyState } from '@/lib/partyProtocol';
import { useParty } from '@/lib/partyRoom';
import { useBeerpongStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Hosting the scoreboard: the phone that is counting puts a code on screen and
 * everyone else watches on their own.
 *
 * This exists because of how the camera mode actually gets used. One person
 * holds the phone, and they are the only one who knows the score — everyone
 * else is at the far end of the table asking. A number on a screen in somebody
 * else's hand is not a scoreboard.
 *
 * The link is to the app itself, so scanning it opens the watcher page in a
 * browser with nothing to install. Whoever scans it can look and nothing else:
 * the host's phone is the only thing that can change the score, which is also
 * the only arrangement that can be true, since it is the only one pointed at
 * the table.
 */
export default function PartyHostScreen() {
  const t = useT();
  const tracker = useBeerpongStore((s) => s.tracker);
  const [code] = useState(() => makePartyCode());
  const { status, watchers, publish } = useParty(ONLINE_AVAILABLE ? code : null, true);

  /**
   * The address a guest's camera will open.
   *
   * On the web that is this deployment plus the watcher path, which is what
   * makes the QR worth anything — a guest scans and is looking at the score,
   * with nothing to install. In a native build there is no public address to
   * point at, so it falls back to the app's own scheme: that opens the app for
   * anybody who already has it, and does nothing for anybody who does not,
   * which the screen says rather than pretending otherwise.
   */
  const link = useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/party/${code}`;
    }
    return Linking.createURL(`/party/${code}`);
  }, [code]);

  /**
   * Sent on every change, with a number that only goes up.
   *
   * The version is what stops a message that took a long way round from putting
   * the score back — see the Party object, which drops anything older than what
   * it holds.
   */
  const version = useRef(0);
  useEffect(() => {
    if (!ONLINE_AVAILABLE) return;
    version.current += 1;
    const state: PartyState = {
      teams: [0, 1].map((index) => ({
        name: tracker.teams[index].name.slice(0, 24),
        cupsLeft: tracker.teams[index].cupsLeft,
        hits: tracker.teams[index].hits,
        throws: tracker.teams[index].throws,
      })) as PartyState['teams'],
      startCups: tracker.startCups,
      activeTeam: tracker.activeTeam,
      winner: tracker.winner,
      version: version.current,
    };
    publish(state);
  }, [tracker, publish]);

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('party.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!ONLINE_AVAILABLE ? (
            <View style={styles.card}>
              <Ionicons name="cloud-offline" size={26} color={colors.textMuted} />
              <Text style={styles.cardTitle}>{t('party.noServer')}</Text>
              <Text style={styles.body}>{t('party.noServerBody')}</Text>
            </View>
          ) : (
            <>
              <View style={[styles.card, glow('soft', colors.neon)]}>
                <View style={styles.qrFrame}>
                  <QrCode value={link} size={200} />
                </View>
                <Text style={styles.code}>{code}</Text>
                <Text style={styles.body}>{t('party.how')}</Text>
              </View>

              <View style={styles.statusRow}>
                <Ionicons
                  name={status === 'open' ? 'radio' : 'ellipsis-horizontal'}
                  size={16}
                  color={status === 'open' ? colors.neon : colors.textMuted}
                />
                <Text style={styles.status}>
                  {status === 'open'
                    ? watchers === 1
                      ? t('party.watching1')
                      : t('party.watchingN', { count: watchers })
                    : t('party.connecting')}
                </Text>
              </View>

              <Text style={styles.footnote}>{t('party.honest')}</Text>
              {Platform.OS !== 'web' ? (
                <Text style={styles.footnote}>{t('party.nativeNote')}</Text>
              ) : null}
            </>
          )}

          <GlowButton
            label={t('common.back')}
            variant="outline"
            size="sm"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'center' },
  card: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
  },
  cardTitle: { fontFamily: fonts.label, fontSize: 15, color: colors.textPrimary },
  // A light mount around the code. A QR on a dark card is a QR that half the
  // scanners in the room will not find.
  qrFrame: {
    backgroundColor: colors.textPrimary,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  code: {
    fontFamily: fonts.headingBlack,
    fontSize: 34,
    letterSpacing: 6,
    color: colors.neon,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  status: { fontFamily: fonts.label, fontSize: 13, color: colors.textSecondary },
  footnote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.md,
  },
});
