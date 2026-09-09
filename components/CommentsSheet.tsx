import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { ReportSheet } from '@/components/ReportSheet';
import { usePostComments } from '@/hooks/usePostComments';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/contexts/AuthContext';
import { confirmDestructive } from '@/lib/confirm';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface CommentsSheetProps {
  postId: string | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export function CommentsSheet({ postId, onClose, onOpenProfile }: CommentsSheetProps) {
  const { comments, error, postComment, deleteComment } = usePostComments(postId);
  const { report, blockUser } = useModeration();
  const { session } = useAuth();
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState<{ commentId: string; userId: string; username: string } | null>(null);

  const handlePost = () => {
    if (!draft.trim()) return;
    postComment(draft);
    setDraft('');
  };

  const handleDelete = (commentId: string) => {
    confirmDestructive('Kommentar löschen?', 'Dieser Kommentar wird entfernt.', 'Löschen', () =>
      deleteComment(commentId)
    );
  };

  return (
    <Modal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('comments.title')}</Text>
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
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenProfile(item.profiles.id);
                  }}
                >
                  <Avatar
                    uri={item.profiles.avatar_url}
                    name={item.profiles.username}
                    size={32}
                    ringColor={item.profiles.equipped_frame_color ?? undefined}
                  />
                </Pressable>
                <View style={styles.commentText}>
                  <Pressable
                    onPress={() => {
                      onClose();
                      onOpenProfile(item.profiles.id);
                    }}
                  >
                    <Text style={styles.commentUsername}>{item.profiles.username}</Text>
                  </Pressable>
                  <Text style={styles.commentContent}>{item.content}</Text>
                </View>
                {item.profiles.id === session?.user.id ? (
                  <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() =>
                      setReportTarget({
                        commentId: item.id,
                        userId: item.profiles.id,
                        username: item.profiles.username,
                      })
                    }
                    hitSlop={8}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            )}
            ListEmptyComponent={<EmptyState title={t('comments.empty')} subtitle={t('comments.emptySubtitle')} />}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('comments.placeholder')}
              placeholderTextColor={colors.textFaint}
            />
            <Pressable onPress={handlePost} style={styles.postButton} disabled={!draft.trim()}>
              <Text style={styles.postButtonText}>{t('comments.post')}</Text>
            </Pressable>
          </View>

          <ReportSheet
            visible={!!reportTarget}
            targetType="comment"
            targetLabel="Diesen Kommentar"
            blockLabel={`@${reportTarget?.username} blockieren`}
            onClose={() => setReportTarget(null)}
            onSubmit={(reason) => report('comment', reportTarget!.commentId, reason)}
            onBlock={() => blockUser(reportTarget!.userId)}
          />
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
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  error: { color: colors.danger, fontSize: fontSizes.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
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
