import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/storage';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

const MAX_PRO_PHOTOS = 5;

export default function NewPostScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { createPost } = usePosts();
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = !!profile?.is_pro;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      aspect: isPro ? undefined : [4, 5],
      allowsEditing: !isPro,
      allowsMultipleSelection: isPro,
      selectionLimit: isPro ? MAX_PRO_PHOTOS : 1,
    });
    if (!result.canceled) setImageUris(result.assets.map((a) => a.uri).slice(0, MAX_PRO_PHOTOS));
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrls = await Promise.all(imageUris.map((uri) => uploadImage(uri, session.user.id)));
      const { error: submitError } = await createPost({
        caption,
        location: location || undefined,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
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

  const canSubmit = (!!caption.trim() || imageUris.length > 0) && !submitting;

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
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {imageUris.length > 0 ? (
              <Image source={{ uri: imageUris[0] }} style={styles.imagePreview} />
            ) : (
              <>
                <Ionicons name="camera" size={40} color={colors.textFaint} style={styles.cameraIcon} />
                <Text style={styles.imagePickerText}>
                  {isPro ? `Fotos auswählen (bis zu ${MAX_PRO_PHOTOS})` : 'Foto auswählen oder aufnehmen'}
                </Text>
              </>
            )}
          </Pressable>

          {imageUris.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {imageUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} />
              ))}
            </ScrollView>
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

          <View style={styles.xpBox}>
            <View style={styles.xpIcon}>
              <Ionicons name="star" size={18} color={colors.blue} />
            </View>
            <View>
              <Text style={styles.xpTitle}>+50 XP für diesen Post</Text>
              <Text style={styles.xpSubtitle}>Täglicher Bonus verfügbar</Text>
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
  title: { color: colors.white, fontWeight: '900', fontSize: fontSizes.xl },
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
  thumbRow: { marginTop: -spacing.md, marginBottom: spacing.lg },
  thumb: { width: 56, height: 56, borderRadius: radii.md, marginRight: spacing.sm },
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
