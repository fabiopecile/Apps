import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useConversationDetail } from '@/hooks/useConversationDetail';
import { supabase } from '@/lib/supabase';
import { addGroupMember } from '@/lib/chat';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

export default function AddGroupMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { conversation, members, refresh } = useConversationDetail(id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.user_id));

  const search = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${text.trim()}%`)
      .limit(20);
    setResults((data as Profile[]) ?? []);
  };

  const handleAdd = async (user: Profile) => {
    setBusyId(user.id);
    setError(null);
    const { error: addError } = await addGroupMember(id, user.id);
    setBusyId(null);
    if (addError) {
      setError(addError);
      return;
    }
    setAddedIds((prev) => new Set(prev).add(user.id));
    refresh();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Zu „{conversation?.title ?? 'Gruppe'}" hinzufügen
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nutzername suchen..."
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={search}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const already = memberIds.has(item.id) || addedIds.has(item.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() => !already && handleAdd(item)}
              disabled={already || busyId === item.id}
            >
              <Avatar
                uri={item.avatar_url}
                name={item.display_name ?? item.username}
                size={44}
                ringColor={item.equipped_frame_color ?? undefined}
              />
              <View style={styles.rowText}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.hint}>
                  {already ? 'Ist schon dabei' : busyId === item.id ? 'Wird hinzugefügt...' : 'Tippen zum Hinzufügen'}
                </Text>
              </View>
              {already ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          query ? (
            <EmptyState title="Keine Nutzer gefunden" />
          ) : (
            <EmptyState title="Wen möchtest du hinzufügen?" subtitle="Suche oben nach einem Nutzernamen." />
          )
        }
      />
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
  },
  title: { flex: 1, color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
  input: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1 },
  username: { color: colors.text, fontWeight: '600', fontSize: fontSizes.md },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: 2 },
});
