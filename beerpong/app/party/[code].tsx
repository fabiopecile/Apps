import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GridBackground } from '@/components/ui/GridBackground';
import { GlowButton } from '@/components/ui/GlowButton';
import { ONLINE_AVAILABLE } from '@/lib/onlineConfig';
import { isPartyCode, normalisePartyCode } from '@/lib/partyProtocol';
import { useParty } from '@/lib/partyRoom';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Watching somebody else's table.
 *
 * Outside the tabs on purpose. Whoever opens this scanned a code at a party;
 * they are here to see a number, not to be handed an app with two modes and a
 * shop. There is nothing to tap and nothing to log into — which is also the
 * reason it can just be a link.
 *
 * The one interactive thing is a way into the rest of the app, at the bottom,
 * for somebody who scanned it and then wanted the app. Anything more would be
 * an advert in the middle of somebody's game.
 */
export default function PartyWatchScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const t = useT();
  const code = normalisePartyCode(params.code ?? '');
  const valid = isPartyCode(code);
  const { status, state, hosted, refusal } = useParty(valid ? code : null, false);

  const teams = state?.teams;

  return (
    <View style={styles.container}>
      <GridBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.code}>{valid ? code : '—'}</Text>
          <View style={styles.liveRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: status === 'open' && hosted ? colors.neon : colors.textMuted },
              ]}
            />
            <Text style={styles.live}>
              {!ONLINE_AVAILABLE
                ? t('party.noServer')
                : !valid
                  ? t('party.badCode')
                  : refusal === 'full'
                    ? t('party.full')
                    : status === 'open'
                      ? hosted
                        ? t('party.live')
                        : t('party.hostGone')
                      : t('party.connecting')}
            </Text>
          </View>
        </View>

        {teams ? (
          <View style={styles.board}>
            {[0, 1].map((index) => {
              const team = teams[index];
              const active = state?.activeTeam === index;
              const won = state?.winner === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.team,
                    active && !state?.winner && glow('soft', colors.neon),
                    active && !state?.winner && { borderColor: colors.neon },
                    won && { borderColor: colors.gold },
                  ]}
                >
                  <Text style={styles.teamName} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <Text style={[styles.cups, won && { color: colors.gold }]}>{team.cupsLeft}</Text>
                  <Text style={styles.sub}>
                    {t('party.record', {
                      hits: team.hits,
                      throws: team.throws,
                      percent: team.throws > 0 ? Math.round((team.hits / team.throws) * 100) : 0,
                    })}
                  </Text>
                  {won ? (
                    <View style={styles.wonRow}>
                      <Ionicons name="trophy" size={16} color={colors.gold} />
                      <Text style={styles.wonText}>{t('party.won')}</Text>
                    </View>
                  ) : active ? (
                    <Text style={styles.turn}>{t('party.turn')}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.waiting}>
            <Ionicons name="hourglass-outline" size={30} color={colors.textMuted} />
            <Text style={styles.waitingText}>
              {valid ? t('party.waiting') : t('party.badCodeBody')}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footnote}>{t('party.watcherNote')}</Text>
          <GlowButton
            label={t('party.openApp')}
            variant="outline"
            size="sm"
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  header: { alignItems: 'center', paddingVertical: spacing.md, gap: 4 },
  code: {
    fontFamily: fonts.headingBlack,
    fontSize: 26,
    letterSpacing: 6,
    color: colors.textPrimary,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  live: { fontFamily: fonts.label, fontSize: 12, color: colors.textMuted },
  board: { flex: 1, justifyContent: 'center', gap: spacing.md },
  team: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderFaint,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundCard,
    paddingVertical: spacing.lg,
    gap: 2,
  },
  teamName: { fontFamily: fonts.label, fontSize: 16, color: colors.textSecondary },
  // Deliberately enormous: this is read across a room, upside down, by somebody
  // holding a cup.
  cups: { fontFamily: fonts.headingBlack, fontSize: 72, color: colors.textPrimary },
  sub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted },
  turn: { fontFamily: fonts.label, fontSize: 12, color: colors.neon, marginTop: 4 },
  wonRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  wonText: { fontFamily: fonts.label, fontSize: 12, color: colors.gold },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  waitingText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  footer: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg },
  footnote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
