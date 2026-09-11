import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlowButton } from '@/components/ui/GlowButton';
import { applySave, deleteSave, fetchSave, pushSave, type CloudSave } from '@/lib/cloudSave';
import { ONLINE_AVAILABLE } from '@/lib/onlineConfig';
import { isSaveCode, looksLikeUnlockCode, makeSaveCode, normaliseSaveCode, prettySaveCode } from '@/lib/saveCode';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

/**
 * Turning the backup on, and getting a save back.
 *
 * The whole feature is one code. Switching it on makes one and starts sending;
 * typing one in somewhere else brings the save down. There is nothing to sign
 * in to and nothing to remember except the code itself — which is why this
 * screen spends most of its room making sure the code leaves the phone.
 */
export function BackupCard() {
  const t = useT();
  const feedback = useFeedback();
  const saveCode = useBeerpongStore((s) => s.saveCode);
  const setSaveCode = useBeerpongStore((s) => s.setSaveCode);
  const lastSyncAt = useBeerpongStore((s) => s.lastSyncAt);

  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  /** Held between "found it" and "yes, overwrite this device". */
  const [pending, setPending] = useState<{ code: string; save: CloudSave } | null>(null);

  if (!ONLINE_AVAILABLE) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('backup.title')}</Text>
        <Text style={styles.body}>{t('backup.noServer')}</Text>
      </View>
    );
  }

  const turnOn = async () => {
    feedback.tap();
    setProblem(null);
    setBusy(true);
    const code = makeSaveCode();
    const result = await pushSave(code);
    setBusy(false);
    if (result !== 'ok') {
      setProblem(t('backup.failed'));
      return;
    }
    setSaveCode(normaliseSaveCode(code));
    feedback.victory();
  };

  const turnOff = async () => {
    feedback.tap();
    if (saveCode) await deleteSave(saveCode);
    setSaveCode(null);
  };

  const share = async () => {
    feedback.tap();
    if (!saveCode) return;
    try {
      await Share.share({
        message: `${t('backup.shareText')}\n\n${prettySaveCode(saveCode)}`,
      });
    } catch {
      // No share sheet here; the code is on screen anyway.
    }
  };

  const look = async () => {
    feedback.tap();
    setProblem(null);
    if (looksLikeUnlockCode(typed)) {
      setProblem(t('backup.thatIsTheUnlockCode'));
      return;
    }
    setBusy(true);
    const code = normaliseSaveCode(typed);
    const save = await fetchSave(code);
    setBusy(false);
    if (!save) {
      setProblem(t('backup.notFound'));
      return;
    }
    setPending({ code, save });
  };

  /**
   * The destructive half, behind its own confirmation.
   *
   * This replaces everything on this device. Somebody who has played here
   * since their last backup is about to lose exactly that, and no amount of
   * cleverness afterwards can get it back — so it is asked plainly first.
   */
  const restore = async () => {
    if (!pending) return;
    feedback.tap();
    setBusy(true);
    const ok = await applySave(pending.save);
    if (!ok) {
      setBusy(false);
      setPending(null);
      setProblem(t('backup.failed'));
      return;
    }
    // Reload rather than rehydrate: half the screens hold state derived from
    // the save that has just been swapped underneath them.
    if (Platform.OS === 'web') {
      (globalThis as { location?: { reload: () => void } }).location?.reload();
      return;
    }
    await useBeerpongStore.persist.rehydrate();
    setBusy(false);
    setPending(null);
    setEntering(false);
  };

  if (pending) {
    return (
      <View style={[styles.card, { borderColor: colors.gold }, glow('soft', colors.gold)]}>
        <Ionicons name="warning" size={26} color={colors.gold} />
        <Text style={styles.title}>{t('backup.confirmTitle')}</Text>
        <Text style={styles.body}>
          {t('backup.confirmBody', { when: formatWhen(pending.save.updatedAt, t) })}
        </Text>
        <GlowButton
          label={t('backup.confirmAction')}
          accent={colors.gold}
          size="sm"
          disabled={busy}
          onPress={restore}
        />
        <GlowButton
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => setPending(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name={saveCode ? 'cloud-done' : 'cloud-offline-outline'}
          size={20}
          color={saveCode ? colors.neon : colors.textMuted}
        />
        <Text style={styles.title}>{t('backup.title')}</Text>
      </View>

      {saveCode ? (
        <>
          <Text style={styles.body}>{t('backup.onBody')}</Text>
          <Text style={styles.body}>{t('backup.oneDevice')}</Text>
          <Text style={styles.codeLabel}>{t('backup.yourCode')}</Text>
          <Text style={styles.code} selectable>
            {prettySaveCode(saveCode)}
          </Text>
          <Text style={styles.warning}>{t('backup.private')}</Text>
          <GlowButton label={t('backup.share')} size="sm" onPress={share} />
          <Text style={styles.meta}>
            {lastSyncAt ? t('backup.lastSync', { when: formatWhen(lastSyncAt, t) }) : t('backup.syncing')}
          </Text>
          <Pressable onPress={turnOff} style={styles.link}>
            <Text style={styles.linkText}>{t('backup.turnOff')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.body}>{t('backup.offBody')}</Text>
          {busy ? (
            <ActivityIndicator color={colors.neon} />
          ) : (
            <GlowButton label={t('backup.turnOn')} size="sm" onPress={turnOn} />
          )}
        </>
      )}

      {problem ? <Text style={styles.problem}>{problem}</Text> : null}

      {entering ? (
        <View style={styles.enterBlock}>
          <Text style={styles.body}>{t('backup.enterBody')}</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="SV-XXXX-XXXX-XXXX"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.neon}
            style={styles.input}
          />
          <GlowButton
            label={t('backup.fetch')}
            variant="outline"
            size="sm"
            disabled={!isSaveCode(typed) || busy}
            onPress={look}
          />
        </View>
      ) : (
        <Pressable onPress={() => setEntering(true)} style={styles.link}>
          <Text style={styles.linkText}>{t('backup.haveCode')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** A time somebody can place: today shows the clock, older shows the date. */
function formatWhen(at: number, t: (key: 'backup.today') => string): string {
  const date = new Date(at);
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return `${t('backup.today')} ${clock}`;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}. ${clock}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.label, fontSize: 14, color: colors.textPrimary },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  codeLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  code: {
    fontFamily: fonts.numeric,
    fontSize: 19,
    letterSpacing: 1.5,
    color: colors.neon,
  },
  warning: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.gold,
    textAlign: 'center',
  },
  meta: { fontFamily: fonts.label, fontSize: 11, color: colors.textMuted },
  problem: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.gold,
    textAlign: 'center',
  },
  link: { paddingVertical: spacing.xs },
  linkText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  enterBlock: { width: '100%', gap: spacing.sm, marginTop: spacing.xs },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.numeric,
    fontSize: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: colors.textPrimary,
  },
});
