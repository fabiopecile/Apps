import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/storage';
import { ImageCropper } from '@/components/ImageCropper';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

const STORY_ASPECT = 9 / 16;

export default function NewStoryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { createStory } = useStories();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) setPendingUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!session || !imageUri) return;
    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrl = await uploadImage(imageUri, session.user.id);
      const { error: submitError } = await createStory({
        media_url: uploadedUrl,
        location: location.trim() || undefined,
        media_aspect_ratio: STORY_ASPECT,
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

  if (pendingUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ImageCropper
          uris={[pendingUri]}
          fixedRatio={STORY_ASPECT}
          title="Story zuschneiden"
          onCancel={() => setPendingUri(null)}
          onDone={(cropped) => {
            setImageUri(cropped[0]?.uri ?? null);
            setPendingUri(null);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Story hinzufügen</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              {location.trim() ? (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={14} color={colors.white} />
                  <Text style={styles.locationBadgeText}>{location.trim()}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Ionicons name="camera" size={40} color={colors.textFaint} style={styles.cameraIcon} />
              <Text style={styles.imagePickerText}>Foto auswählen</Text>
            </>
          )}
        </Pressable>

        {imageUri ? (
          <Pressable style={styles.recropButton} onPress={() => setPendingUri(imageUri)}>
            <Ionicons name="crop" size={14} color={colors.text} />
            <Text style={styles.recropText}>Anpassen</Text>
          </Pressable>
        ) : null}

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color={colors.textFaint} style={styles.locationIcon} />
          <TextInput
            style={styles.locationInput}
            placeholder="Standort hinzufügen (optional)"
            placeholderTextColor={colors.textFaint}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submitButton, (!imageUri || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!imageUri || submitting}
        >
          <Text style={styles.submitText}>{submitting ? 'Wird geteilt...' : 'STORY TEILEN'}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  imagePicker: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cameraIcon: { marginBottom: spacing.sm },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { color: colors.textMuted, fontSize: fontSizes.sm },
  recropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  recropText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.xs },
  locationBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationBadgeText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  locationRow: { position: 'relative', justifyContent: 'center', marginBottom: spacing.lg },
  locationIcon: { position: 'absolute', left: spacing.md, zIndex: 1 },
  locationInput: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    paddingVertical: spacing.md,
    paddingLeft: spacing.xl + spacing.md,
    paddingRight: spacing.md,
  },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  submitButton: {
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, letterSpacing: 0.5 },
});
