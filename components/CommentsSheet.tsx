import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { usePostComments } from '@/hooks/usePostComments';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export function CommentsSheet({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const { comments, postComment } = usePostComments(postId);
  const [draft, setDraft] = useState('');

  const handlePost = () => {
    if (!draft.trim()) return;
    postComment(draft);
    setDraft('');
  };

  return (
    <Modal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Kommentare</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Avatar uri={item.profiles.avatar_url} name={item.profiles.username} size={32} />
                <View style={styles.commentText}>
                  <Text style={styles.commentUsername}>{item.profiles.username}</Text>
                  <Text style={styles.commentContent}>{item.content}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<EmptyState title="Noch keine Kommentare" subtitle="Sei der Erste!" />}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Kommentar schreiben..."
              placeholderTextColor={colors.textFaint}
            />
            <Pressable onPress={handlePost} style={styles.postButton} disabled={!draft.trim()}>
              <Text style={styles.postButtonText}>Posten</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '70%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.lg },
  list: { paddingHorizontal: spacing.lg },
  commentRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  commentText: { flex: 1 },
  commentUsername: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  commentContent: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  postButton: { backgroundColor: colors.redDark, borderRadius: radii.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  postButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
});
