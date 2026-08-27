import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Profile } from '@/lib/database.types';

export default function AdminScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [xpInput, setXpInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [notifResult, setNotifResult] = useState<string | null>(null);

  if (!profile?.is_admin) return <Redirect href="/(tabs)/profil" />;

  const search = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${text.trim()}%`).limit(20);
    setResults((data as Profile[]) ?? []);
  };

  const openEditor = (user: Profile) => {
    setEditingUser(user);
    setPointsInput(String(user.points));
    setXpInput(String(user.xp));
  };

  const saveEdits = async () => {
    if (!editingUser) return;
    const points = Number(pointsInput);
    const xp = Number(xpInput);
    if (Number.isNaN(points) || Number.isNaN(xp)) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ points, xp, level: Math.floor(xp / 1000) + 1 })
      .eq('id', editingUser.id);
    setSaving(false);
    setEditingUser(null);
    search(query);
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setSending(true);
    setNotifResult(null);
    const { data, error } = await supabase.functions.invoke('admin-send-notification', {
      body: { title: notifTitle.trim(), body: notifBody.trim(), target_user_id: notifTarget?.id },
    });
    setSending(false);
    if (error) {
      setNotifResult(`Fehler: ${error.message}`);
    } else {
      setNotifResult(`Gesendet an ${data?.sent ?? 0} Gerät(e).`);
      setNotifTitle('');
      setNotifBody('');
      setNotifTarget(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.adsLink} onPress={() => router.push('/admin/ads')}>
          <Ionicons name="megaphone-outline" size={20} color={colors.gold} />
          <Text style={styles.adsLinkText}>Werbung verwalten</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gold} />
        </Pressable>

        <Pressable style={styles.adsLink} onPress={() => router.push('/admin/prize')}>
          <Ionicons name="trophy-outline" size={20} color={colors.gold} />
          <Text style={styles.adsLinkText}>Monatspreis festlegen</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gold} />
        </Pressable>

        <Text style={styles.sectionTitle}>Punkte / XP anpassen</Text>
        <TextInput
          style={styles.input}
          placeholder="Nutzername suchen..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={search}
          autoCapitalize="none"
        />

        {results.map((user) => (
          <View key={user.id} style={styles.userRow}>
            <View style={styles.userRowMain}>
              <Avatar
                uri={user.avatar_url}
                name={user.username}
                size={36}
                ringColor={user.equipped_frame_color ?? undefined}
              />
              <View>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.userMeta}>{user.points} Punkte · {user.xp} XP</Text>
              </View>
            </View>
            <Pressable style={styles.iconButton} onPress={() => openEditor(user)} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={colors.blue} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setNotifTarget(user)} hitSlop={8}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={notifTarget?.id === user.id ? colors.red : colors.textMuted}
              />
            </Pressable>
          </View>
        ))}

        {editingUser ? (
          <View style={styles.editor}>
            <Text style={styles.editorTitle}>{editingUser.username} bearbeiten</Text>
            <Text style={styles.label}>Punkte</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={pointsInput} onChangeText={setPointsInput} />
            <Text style={styles.label}>XP</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={xpInput} onChangeText={setXpInput} />
            <View style={styles.editorButtons}>
              <Pressable style={styles.cancelButton} onPress={() => setEditingUser(null)}>
                <Text style={styles.cancelText}>Abbrechen</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveEdits} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Speichert...' : 'Speichern'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Push-Nachricht senden</Text>
        <TextInput
          style={styles.input}
          placeholder="Titel"
          placeholderTextColor={colors.textFaint}
          value={notifTitle}
          onChangeText={setNotifTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Nachricht"
          placeholderTextColor={colors.textFaint}
          value={notifBody}
          onChangeText={setNotifBody}
          multiline
        />
        <Text style={styles.label}>
          Empfänger: {notifTarget ? notifTarget.username : 'Alle Nutzer mit aktivierten Benachrichtigungen'}
        </Text>
        {notifTarget ? (
          <Pressable onPress={() => setNotifTarget(null)}>
            <Text style={styles.clearTarget}>Auswahl aufheben (an alle senden)</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Tippe oben bei einem Suchergebnis auf 🔔, um nur an diese Person zu senden.</Text>
        )}
        {notifResult ? <Text style={styles.result}>{notifResult}</Text> : null}
        <Pressable
          style={[styles.sendButton, (!notifTitle.trim() || !notifBody.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendNotification}
          disabled={!notifTitle.trim() || !notifBody.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? 'Wird gesendet...' : 'Senden'}</Text>
        </Pressable>
      </ScrollView>
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
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  content: { padding: spacing.lg, gap: spacing.sm },
  adsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  adsLinkText: { flex: 1, color: colors.gold, fontWeight: '800', fontSize: fontSizes.md },
  sectionTitle: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.white,
    fontSize: fontSizes.sm,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  userRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  username: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  userMeta: { color: colors.textMuted, fontSize: fontSizes.xs },
  iconButton: { padding: spacing.xs },
  editor: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: spacing.xs,
  },
  editorTitle: { color: colors.white, fontWeight: '700', marginBottom: spacing.xs },
  label: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs },
  editorButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderStrong },
  cancelText: { color: colors.textMuted, fontWeight: '700' },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.blue },
  saveText: { color: colors.white, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg },
  clearTarget: { color: colors.blue, fontSize: fontSizes.xs },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs },
  result: { color: colors.success, fontSize: fontSizes.sm },
  sendButton: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: colors.red },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: colors.white, fontWeight: '800' },
});
