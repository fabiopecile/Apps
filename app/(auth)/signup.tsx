import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

export default function SignupScreen() {
  const { session, signUp } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session, router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const { error: signUpError } = await signUp(email.trim(), password, username.trim(), referralCode.trim());
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
        <Text style={styles.tagline}>{t('auth.signupTagline')}</Text>

        {confirmationSent ? (
          <Text style={styles.info}>{t('auth.confirmEmail')}</Text>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.username')}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordHint')}
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.referralCode')}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={t('auth.signup')}
              variant="red"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password || !username}
            />
          </View>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>
            {t('auth.hasAccount')} <Text style={styles.linkAccent}>{t('auth.login')}</Text>
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
