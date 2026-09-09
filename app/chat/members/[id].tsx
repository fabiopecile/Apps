import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useConversationDetail } from '@/hooks/useConversationDetail';
import { useAuth } from '@/contexts/AuthContext';
import { setGroupAdmin, leaveConversation } from '@/lib/chat';
import { confirmDestructive } from '@/lib/confirm';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { conversation, members, isAdmin, loading, error, refresh } = useConversationDetail(id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <LoadingScreen />;

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setBusyId(userId);
    setActionError(null);
    const { error: adminError } = await setGroupAdmin(id, userId, makeAdmin);
    setBusyId(null);
    if (adminError) setActionError(adminError);
    else refresh();
  };

  const handleLeave = () => {
    confirmDestructive(
      'Gruppe verlassen?',
      'Du siehst die Nachrichten dieser Gruppe dann nicht mehr.',
      'Verlassen',
      async () => {
        if (!session) return;
        const { error: leaveError } = await leaveConversation(id, session.user.id);
        if (leaveError) setActionError(leaveError);
        else router.replace('/(tabs)/chat');
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation?.title ?? 'Gruppe'}
          </Text>
          <Text style={styles.subtitle}>{members.length} Mitglieder</Text>
        </View>
        {isAdmin ? (
          <Pressable onPress={() => router.push(`/chat/add-member/${id}`)} hitSlop={8}>
            <Ionicons name="person-add" size={22} color={colors.white} />
          </Pressable>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <ErrorBanner message={error} onRetry={refresh} />
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMe = item.user_id === session?.user.id;
          return (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => !isMe && router.push(`/user/${item.profiles.id}`)}
                disabled={isMe}
              >
                <Avatar
                  uri={item.profiles.avatar_url}
                  name={item.profiles.username}
                  size={44}
                  ringColor={item.profiles.equipped_frame_color ?? undefined}
                />
                <View style={styles.rowText}>
                  <Text style={styles.name}>
                    {isMe ? 'Du' : item.profiles.username}
                  </Text>
                  {item.is_admin ? <Text style={styles.adminTag}>Admin</Text> : null}
                </View>
              </Pressable>

              {isAdmin ? (
                <Pressable
                  style={[styles.adminButton, item.is_admin && styles.adminButtonOn]}
                  onPress={() => handleToggleAdmin(item.user_id, !item.is_admin)}
                  disabled={busyId === item.user_id}
                >
                  <Text style={[styles.adminButtonText, item.is_admin && styles.adminButtonTextOn]}>
                    {busyId === item.user_id ? '...' : item.is_admin ? 'Admin entziehen' : 'Zum Admin'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Pressable style={styles.leaveButton} onPress={handleLeave}>
        <Ionicons name="exit-outline" size={18} color={colors.danger} />
        <Text style={styles.leaveText}>Gruppe verlassen</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: { flex: 1 },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.lg, letterSpacing: -0.3 },
  subtitle: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: 1 },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center', padding: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  adminTag: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '700', marginTop: 2 },
  adminButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  adminButtonOn: { borderColor: colors.gold },
  adminButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  adminButtonTextOn: { color: colors.gold },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  leaveText: { color: colors.danger, fontWeight: '700', fontSize: fontSizes.sm },
});
