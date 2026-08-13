import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export default function FriendRequestsScreen() {
  const router = useRouter();
  const { incoming, loading, respond } = useFriendRequests();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Freundschaftsanfragen</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={incoming}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar uri={item.sender.avatar_url} name={item.sender.username} size={48} />
              <View style={styles.rowText}>
                <Text style={styles.username}>{item.sender.username}</Text>
                <Text style={styles.subtitle}>Möchte dein Freund sein</Text>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.declineButton} onPress={() => respond(item.id, false)}>
                  <Text style={styles.declineText}>Ablehnen</Text>
                </Pressable>
                <Pressable style={styles.acceptButton} onPress={() => respond(item.id, true)}>
                  <Text style={styles.acceptText}>Annehmen</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState title="Keine offenen Anfragen" />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  listContent: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowText: { flex: 1 },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  actions: { gap: spacing.xs },
  declineButton: { backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  declineText: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '700' },
  acceptButton: { backgroundColor: colors.success, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  acceptText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
});
