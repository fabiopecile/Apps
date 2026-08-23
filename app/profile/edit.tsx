import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/components/Avatar';
import { ImageCropper } from '@/components/ImageCropper';
import { MAX_AVATAR_WIDTH } from '@/lib/imageCrop';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/storage';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

const BIO_LIMIT = 160;

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) setPendingAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const avatarUrl = avatarUri ? await uploadAvatar(avatarUri, profile.id) : undefined;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq('id', profile.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refreshProfile();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (pendingAvatarUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ImageCropper
          uris={[pendingAvatarUri]}
          fixedRatio={1}
          maxWidth={MAX_AVATAR_WIDTH}
          title="Profilbild zuschneiden"
          onCancel={() => setPendingAvatarUri(null)}
          onDone={(cropped) => {
            setAvatarUri(cropped[0]?.uri ?? null);
            setPendingAvatarUri(null);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil bearbeiten</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
            <Avatar
              uri={avatarUri ?? profile.avatar_url}
              name={displayName || profile.username}
              size={96}
              ringColor={profile.equipped_frame_color ?? colors.red}
            />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={15} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Zum Ändern tippen</Text>

          <Text style={styles.label}>ANZEIGENAME</Text>
          <TextInput
            style={styles.input}
            placeholder={profile.username}
            placeholderTextColor={colors.textFaint}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
          />
          <Text style={styles.helper}>Dein Benutzername @{profile.username} bleibt unverändert.</Text>

          <Text style={styles.label}>BIO</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Erzähl kurz was über dich..."
            placeholderTextColor={colors.textFaint}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_LIMIT))}
            multiline
          />
          <Text style={styles.helper}>
            {bio.length}/{BIO_LIMIT}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Wird gespeichert...' : 'Speichern'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  content: { padding: spacing.lg },
  avatarWrap: { alignSelf: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    color: colors.textFaint,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textFaint,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  bioInput: { minHeight: 90, textAlignVertical: 'top' },
  helper: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: spacing.xs, marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: fontSizes.sm, marginBottom: spacing.md },
  saveButton: {
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
});
