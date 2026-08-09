import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function SignupScreen() {
  const { session, signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session, router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const { error: signUpError } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
    } else {
      setConfirmationSent(true);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          TEAM<Text style={styles.logoAccent}>UP</Text>
          <Text style={styles.logoAccent}>11</Text>
        </Text>
        <Text style={styles.tagline}>Erstelle dein Konto</Text>

        {confirmationSent ? (
          <Text style={styles.info}>
            Fast geschafft! Bestätige deine E-Mail-Adresse, um dich einzuloggen.
          </Text>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Benutzername"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Passwort (min. 6 Zeichen)"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label="Sign Up"
              variant="red"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password || !username}
            />
          </View>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>
            Schon ein Konto? <Text style={styles.linkAccent}>Log In</Text>
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  logo: { fontSize: 40, fontWeight: '900', color: colors.white, marginBottom: spacing.xs },
  logoAccent: { color: colors.red },
  tagline: { color: colors.textMuted, marginBottom: spacing.xl },
  form: { width: '100%', gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSizes.md,
  },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center' },
  info: { color: colors.success, textAlign: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  link: { marginTop: spacing.xl },
  linkText: { color: colors.textMuted },
  linkAccent: { color: colors.red, fontWeight: '700' },
});
