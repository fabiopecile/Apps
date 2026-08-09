import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session, router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>
          TEAM<Text style={styles.logoAccent}>UP</Text>
          <Text style={styles.logoAccent}>11</Text>
        </Text>
        <Text style={styles.tagline}>Tippen. Posten. Gewinnen.</Text>

        {!isSupabaseConfigured ? (
          <Text style={styles.warning}>
            Supabase ist noch nicht konfiguriert. Siehe README.md für die Einrichtung.
          </Text>
        ) : null}

        <View style={styles.form}>
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
            placeholder="Passwort"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Log In" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
        </View>

        <Link href="/(auth)/signup" style={styles.link}>
          <Text style={styles.linkText}>
            Noch kein Konto? <Text style={styles.linkAccent}>Sign Up</Text>
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
  warning: {
    color: colors.gold,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
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
  link: { marginTop: spacing.xl },
  linkText: { color: colors.textMuted },
  linkAccent: { color: colors.blue, fontWeight: '700' },
});
