import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { passwordResetRedirectUrl } from '@/lib/authLinks';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordResetRedirectUrl(),
    });
    setLoading(false);
    // Deliberately show the same confirmation either way: telling the user
    // "this address is unknown" would leak which emails have accounts.
    if (resetError && !resetError.message.toLowerCase().includes('user not found')) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          TEAM<Text style={styles.logoAccent}>UP</Text>
          <Text style={styles.logoAccent}>11</Text>
        </Text>
        <Text style={styles.tagline}>Passwort zurücksetzen</Text>

        {sent ? (
          <Text style={styles.info}>
            Wenn es ein Konto mit dieser Adresse gibt, ist eine E-Mail mit einem Link zum Zurücksetzen
            unterwegs. Schau auch im Spam-Ordner nach.
          </Text>
        ) : (
          <View style={styles.form}>
            <Text style={styles.description}>
              Gib deine E-Mail-Adresse ein – wir schicken dir einen Link, mit dem du ein neues Passwort
              festlegen kannst.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Link senden" onPress={handleSubmit} loading={loading} disabled={!email.trim()} />
          </View>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>
            Zurück zum <Text style={styles.linkAccent}>Log In</Text>
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  logo: { fontSize: 40, fontWeight: '800', color: colors.text, marginBottom: spacing.xs, letterSpacing: -1 },
  logoAccent: { color: colors.red },
  tagline: { color: colors.textMuted, marginBottom: spacing.xl },
  form: { width: '100%', gap: spacing.md },
  description: { color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 19 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center' },
  info: { color: colors.success, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 20 },
  link: { marginTop: spacing.xl },
  linkText: { color: colors.textMuted },
  linkAccent: { color: colors.blue, fontWeight: '700' },
});
