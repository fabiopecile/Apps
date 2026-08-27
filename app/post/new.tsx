import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/storage';
import { ImageCropper, type CroppedImage } from '@/components/ImageCropper';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { hasPro } from '@/lib/pro';

const MAX_PRO_PHOTOS = 5;
const DEFAULT_ASPECT = 4 / 5;

export default function NewPostScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { createPost } = usePosts();
  const [images, setImages] = useState<CroppedImage[]>([]);
  const [pendingUris, setPendingUris] = useState<string[] | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = hasPro(profile);
  const aspectRatio = images[0]?.aspectRatio ?? DEFAULT_ASPECT;
  const xpAlreadyEarned = profile?.last_post_xp_date === new Date().toISOString().slice(0, 10);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    // No allowsEditing here - the built-in crop UI is square-only on iOS and
    // missing entirely on web, so framing happens in our own cropper instead.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: isPro,
      selectionLimit: isPro ? MAX_PRO_PHOTOS : 1,
    });
    if (!result.canceled) setPendingUris(result.assets.map((a) => a.uri).slice(0, MAX_PRO_PHOTOS));
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrls = await Promise.all(images.map((image) => uploadImage(image.uri, session.user.id)));
      const { error: submitError } = await createPost({
        caption,
        location: location || undefined,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        image_aspect_ratio: images.length > 0 ? aspectRatio : undefined,
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

  const canSubmit = (!!caption.trim() || images.length > 0) && !submitting;

  if (pendingUris) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ImageCropper
          uris={pendingUris}
          onCancel={() => setPendingUris(null)}
          onDone={(cropped) => {
            setImages(cropped);
            setPendingUris(null);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Beitrag erstellen</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable
            style={[styles.imagePicker, images.length > 0 && { aspectRatio, maxHeight: undefined }]}
            onPress={pickImage}
          >
            {images.length > 0 ? (
              <Image source={{ uri: images[0].uri }} style={styles.imagePreview} />
            ) : (
              <>
                <Ionicons name="camera" size={40} color={colors.textFaint} style={styles.cameraIcon} />
                <Text style={styles.imagePickerText}>
                  {isPro ? `Fotos auswählen (bis zu ${MAX_PRO_PHOTOS})` : 'Foto auswählen oder aufnehmen'}
                </Text>
              </>
            )}
          </Pressable>

          {images.length > 0 ? (
            <View style={styles.editRow}>
              {images.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                  {images.map((image) => (
                    <Image key={image.uri} source={{ uri: image.uri }} style={styles.thumb} />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.flex} />
              )}
              <Pressable
                style={styles.recropButton}
                onPress={() => setPendingUris(images.map((image) => image.uri))}
              >
                <Ionicons name="crop" size={14} color={colors.text} />
                <Text style={styles.recropText}>Anpassen</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.label}>BESCHREIBUNG</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Schreibe eine Caption..."
            placeholderTextColor={colors.textFaint}
            value={caption}
            onChangeText={setCaption}
            multiline
          />

          <Text style={styles.label}>ORT</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={colors.textFaint} style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="z.B. Allianz Arena"
              placeholderTextColor={colors.textFaint}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={[styles.xpBox, xpAlreadyEarned && styles.xpBoxSpent]}>
            <View style={styles.xpIcon}>
              <Ionicons
                name={xpAlreadyEarned ? 'checkmark' : 'star'}
                size={18}
                color={xpAlreadyEarned ? colors.textMuted : colors.blue}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.xpTitle}>
                {xpAlreadyEarned ? 'XP-Bonus heute schon erhalten' : '+50 XP für diesen Beitrag'}
              </Text>
              <Text style={styles.xpSubtitle}>
                {xpAlreadyEarned
                  ? 'Posten geht weiterhin – XP gibt es morgen wieder.'
                  : 'Einmal pro Tag für den ersten Beitrag'}
              </Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Ionicons name="paper-plane" size={18} color={colors.white} />
            <Text style={styles.submitText}>{submitting ? 'Wird gepostet...' : 'POSTEN'}</Text>
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
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  imagePicker: {
    aspectRatio: 4 / 5,
    maxHeight: 340,
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  thumbRow: { flex: 1 },
  thumb: { width: 56, height: 56, borderRadius: radii.md, marginRight: spacing.sm },
  recropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recropText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.xs },
  imagePickerText: { color: colors.textMuted, fontSize: fontSizes.sm },
  label: {
    color: colors.textFaint,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  captionInput: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  locationRow: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
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
  xpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.blueDark,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  xpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBoxSpent: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  xpTitle: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  xpSubtitle: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, letterSpacing: 0.5 },
});
