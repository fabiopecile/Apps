import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startProCheckout, openProBillingPortal } from '@/lib/pro';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export function ProCard({ isPro }: { isPro: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = async () => {
    setLoading(true);
    setError(null);
    const { error: actionError } = isPro ? await openProBillingPortal() : await startProCheckout();
    setLoading(false);
    if (actionError) setError(actionError);
  };

  return (
    <View style={[styles.card, isPro && styles.cardPro]}>
      <View style={styles.header}>
        <Ionicons name={isPro ? 'star' : 'star-outline'} size={22} color={colors.gold} />
        <Text style={styles.title}>{isPro ? 'TeamUp11 Pro aktiv' : 'TeamUp11 Pro'}</Text>
      </View>
      <Text style={styles.subtitle}>
        {isPro
          ? 'Danke, dass du TeamUp11 unterstützt! Alle Pro-Funktionen sind freigeschaltet.'
          : 'Keine Werbung, KI-Team-Statistiken, Story-Archiv, mehrere Fotos pro Beitrag, private Ligen mit Freunden und mehr.'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handlePress} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Lädt...' : isPro ? 'Abo verwalten' : 'Pro werden'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cardPro: { borderColor: colors.gold },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: fontSizes.xs, marginBottom: spacing.sm },
  button: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  buttonText: { color: colors.gold, fontWeight: '800', fontSize: fontSizes.sm },
});
