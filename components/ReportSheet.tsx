import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PopIn } from '@/components/PopIn';
import { REPORT_REASONS, type ReportTarget } from '@/hooks/useModeration';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

interface ReportSheetProps {
  visible: boolean;
  targetType: ReportTarget;
  /** Shown in the confirmation, e.g. "diesen Beitrag". */
  targetLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<{ error: string | null }>;
  /** Offered alongside reporting when there's a user behind the content. */
  onBlock?: () => Promise<{ error: string | null }>;
  blockLabel?: string;
}

export function ReportSheet({
  visible,
  targetLabel,
  onClose,
  onSubmit,
  onBlock,
  blockLabel,
}: ReportSheetProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setDone(null);
    setError(null);
    onClose();
  };

  const handleReport = async (reason: string) => {
    setBusy(true);
    setError(null);
    const { error: reportError } = await onSubmit(reason);
    setBusy(false);
    if (reportError) setError(reportError);
    else setDone('Danke – wir schauen uns das an.');
  };

  const handleBlock = async () => {
    if (!onBlock) return;
    setBusy(true);
    setError(null);
    const { error: blockError } = await onBlock();
    setBusy(false);
    if (blockError) setError(blockError);
    else setDone('Blockiert. Du siehst keine Inhalte mehr von dieser Person.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <PopIn style={styles.card}>
          {done ? (
            <>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              <Text style={styles.doneText}>{done}</Text>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeText}>Schließen</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{targetLabel} melden</Text>
              <Text style={styles.subtitle}>Warum meldest du das?</Text>

              {REPORT_REASONS.map((reason) => (
                <Pressable key={reason} style={styles.reasonRow} onPress={() => handleReport(reason)} disabled={busy}>
                  <Text style={styles.reasonText}>{reason}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              ))}

              {onBlock ? (
                <Pressable style={styles.blockRow} onPress={handleBlock} disabled={busy}>
                  <Ionicons name="ban" size={16} color={colors.danger} />
                  <Text style={styles.blockText}>{blockLabel ?? 'Nutzer blockieren'}</Text>
                </Pressable>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeText}>Abbrechen</Text>
              </Pressable>
            </>
          )}
        </PopIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.lg, letterSpacing: -0.3 },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2, marginBottom: spacing.md },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reasonText: { color: colors.text, fontSize: fontSizes.sm },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  blockText: { color: colors.danger, fontWeight: '700', fontSize: fontSizes.sm },
  error: { color: colors.danger, fontSize: fontSizes.xs, marginTop: spacing.sm, textAlign: 'center' },
  doneText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  closeButton: { marginTop: spacing.md, paddingVertical: spacing.sm },
  closeText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSizes.sm },
});
