import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/storage';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function NewPostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { createPost } = usePosts();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      aspect: [4, 5],
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrl = imageUri ? await uploadImage(imageUri, session.user.id) : undefined;
      const { error: submitError } = await createPost({
        caption,
        location: location || undefined,
        image_url: uploadedUrl,
      });
      if (submitError) {
        setError(submitError);
        return;
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Abbrechen</Text>
        </Pressable>
        <Text style={styles.title}>Neuer Beitrag</Text>
        <View style={{ width: 70 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.imagePickerText}>📷 Foto auswählen</Text>
            )}
          </Pressable>

          <TextInput
            style={styles.captionInput}
            placeholder="Was gibt's Neues vom Spiel?"
            placeholderTextColor={colors.textFaint}
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <TextInput
            style={styles.locationInput}
            placeholder="📍 Standort (optional)"
            placeholderTextColor={colors.textFaint}
            value={location}
            onChangeText={setLocation}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Posten (+50 XP)"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!caption && !imageUri}
            style={styles.submitButton}
          />
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
    paddingVertical: spacing.md,
  },
  cancel: { color: colors.textMuted, fontSize: fontSizes.md, width: 70 },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  imagePicker: {
    aspectRatio: 4 / 5,
    maxHeight: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { color: colors.textMuted, fontSize: fontSizes.md },
  captionInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  locationInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  submitButton: { marginTop: spacing.sm },
});
