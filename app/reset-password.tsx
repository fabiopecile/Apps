import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

const MIN_LENGTH = 8;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_LENGTH && password === confirm;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  // Without a session there's nothing to change the password on - that happens
  // when the link has expired or was opened in a different browser.
  if (!session && !done) {
    return (
      <View style={styles.centered}>
        <Text style={styles.tagline}>Link abgelaufen</Text>
        <Text style={styles.description}>
          Dieser Link ist nicht mehr gültig. Fordere unter „Passwort vergessen" einen neuen an.
        </Text>
        <Pressable style={styles.link} onPress={() => router.replace('/(auth)/forgot-password')}>
          <Text style={styles.linkAccent}>Neuen Link anfordern</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          TEAM<Text style={styles.logoAccent}>UP11</Text>
        </Text>
        <Text style={styles.tagline}>Neues Passwort</Text>

        {done ? (
          <>
            <Text style={styles.info}>Dein Passwort wurde geändert.</Text>
            <Pressable style={styles.link} onPress={() => router.replace('/')}>
              <Text style={styles.linkAccent}>Weiter zur App</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.form}>
            <Text style={styles.description}>Wähle ein neues Passwort mit mindestens {MIN_LENGTH} Zeichen.</Text>
            <TextInput
              style={styles.input}
              placeholder="Neues Passwort"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Passwort wiederholen"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoCapitalize="none"
              value={confirm}
              onChangeText={setConfirm}
            />
            {tooShort ? <Text style={styles.error}>Mindestens {MIN_LENGTH} Zeichen.</Text> : null}
            {mismatch ? <Text style={styles.error}>Die Passwörter stimmen nicht überein.</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Passwort speichern" onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
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
  info: { color: colors.success, textAlign: 'center', lineHeight: 20 },
  link: { marginTop: spacing.lg, padding: spacing.sm },
  linkAccent: { color: colors.blue, fontWeight: '700' },
});
