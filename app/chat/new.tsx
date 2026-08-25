import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { openConversationWith, createGroupConversation } from '@/lib/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

export default function NewConversationScreen() {
  const router = useRouter();
  const { group } = useLocalSearchParams<{ group?: string }>();
  const isGroupMode = group === '1';
  const { session } = useAuth();
  const { sendRequest } = useFriendRequests();
  const [groupTitle, setGroupTitle] = useState('');
  const [selected, setSelected] = useState<Profile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const search = async (text: string) => {
    setQuery(text);
    if (!text.trim() || !session) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${text.trim()}%`)
      .neq('id', session.user.id)
      .limit(20);
    setResults((data as Profile[]) ?? []);
  };

  const startConversation = async (otherUser: Profile) => {
    if (!session) return;
    setCreatingId(otherUser.id);
    setError(null);

    const { conversationId, error: chatError } = await openConversationWith(session.user.id, otherUser.id);
    setCreatingId(null);

    if (chatError || !conversationId) {
      setError(chatError ?? 'Chat konnte nicht geöffnet werden');
      return;
    }
    router.replace(`/chat/${conversationId}`);
  };

  const toggleSelected = (user: Profile) => {
    setSelected((current) =>
      current.some((u) => u.id === user.id)
        ? current.filter((u) => u.id !== user.id)
        : [...current, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || selected.length === 0) return;
    setCreatingGroup(true);
    setError(null);
    const { conversationId, error: groupError } = await createGroupConversation(
      groupTitle,
      selected.map((u) => u.id)
    );
    setCreatingGroup(false);
    if (groupError || !conversationId) {
      setError(groupError ?? 'Gruppe konnte nicht erstellt werden');
      return;
    }
    router.replace(`/chat/${conversationId}`);
  };

  const handleSendRequest = async (userId: string) => {
    const { error: requestError } = await sendRequest(userId);
    if (!requestError) setRequestedIds((prev) => new Set(prev).add(userId));
    else setError(requestError);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{isGroupMode ? 'Neue Gruppe' : 'Neue Nachricht'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {isGroupMode ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Gruppenname"
            placeholderTextColor={colors.textFaint}
            value={groupTitle}
            onChangeText={setGroupTitle}
            maxLength={40}
          />
          {selected.length > 0 ? (
            <View style={styles.chips}>
              {selected.map((user) => (
                <Pressable key={user.id} style={styles.chip} onPress={() => toggleSelected(user)}>
                  <Text style={styles.chipText}>{user.username}</Text>
                  <Ionicons name="close" size={13} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

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
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => (isGroupMode ? toggleSelected(item) : startConversation(item))}
              disabled={!isGroupMode && creatingId === item.id}
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
                  {isGroupMode
                    ? selected.some((u) => u.id === item.id)
                      ? 'Ausgewählt'
                      : 'Tippen zum Hinzufügen'
                    : creatingId === item.id
                      ? 'Öffnet Chat...'
                      : 'Tippen zum Schreiben'}
                </Text>
              </View>
            </Pressable>
            {isGroupMode ? (
              <View
                style={[styles.checkbox, selected.some((u) => u.id === item.id) && styles.checkboxOn]}
              >
                {selected.some((u) => u.id === item.id) ? (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                ) : null}
              </View>
            ) : (
              <Pressable
                style={styles.addFriendButton}
                onPress={() => handleSendRequest(item.id)}
                disabled={requestedIds.has(item.id)}
              >
                <Ionicons
                  name={requestedIds.has(item.id) ? 'checkmark' : 'person-add'}
                  size={16}
                  color={requestedIds.has(item.id) ? colors.success : colors.text}
                />
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          query ? (
            <EmptyState title="Keine Nutzer gefunden" />
          ) : (
            <EmptyState
              title={isGroupMode ? 'Wer soll in die Gruppe?' : 'Wen möchtest du anschreiben?'}
              subtitle={
                isGroupMode
                  ? 'Gib der Gruppe einen Namen und such nach Nutzernamen, um Mitglieder auszuwählen.'
                  : 'Suche oben nach einem Nutzernamen und tippe auf die Person, um den Chat zu öffnen.'
              }
            />
          )
        }
      />

      {isGroupMode ? (
        <Pressable
          style={[
            styles.createButton,
            (!groupTitle.trim() || selected.length === 0 || creatingGroup) && styles.createButtonDisabled,
          ]}
          onPress={handleCreateGroup}
          disabled={!groupTitle.trim() || selected.length === 0 || creatingGroup}
        >
          <Text style={styles.createButtonText}>
            {creatingGroup
              ? 'Wird erstellt...'
              : `Gruppe erstellen${selected.length ? ` (${selected.length})` : ''}`}
          </Text>
        </Pressable>
      ) : null}
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
  },
  title: { color: colors.white, fontWeight: '700', fontSize: fontSizes.md },
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  username: { color: colors.text, fontWeight: '600', fontSize: fontSizes.md },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs, marginTop: 2 },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: fontSizes.xs, fontWeight: '600' },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.red, borderColor: colors.red },
  createButton: {
    margin: spacing.lg,
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.4 },
  createButtonText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  addFriendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
