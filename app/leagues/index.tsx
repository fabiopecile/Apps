import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Share } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateLeagues } from '@/hooks/usePrivateLeagues';
import { EmptyState } from '@/components/EmptyState';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { hasPro } from '@/lib/pro';

export default function PrivateLeaguesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { leagues, loading, createLeague, joinLeague } = usePrivateLeagues();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPro(profile)) return <Redirect href="/(tabs)/profil" />;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const { league, error: createError } = await createLeague(name.trim());
    setCreating(false);
    if (createError) {
      setError(createError);
      return;
    }
    setName('');
    if (league) {
      Share.share({ message: `Tritt meiner privaten Liga "${league.name}" auf TeamUp11 bei! Code: ${league.code}` });
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError(null);
    const { error: joinError } = await joinLeague(code.trim());
    setJoining(false);
    if (joinError) setError(joinError);
    else setCode('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Private Ligen</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        data={leagues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Neue Liga erstellen</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  placeholder="Liganame"
                  placeholderTextColor={colors.textFaint}
                  value={name}
                  onChangeText={setName}
                />
                <Pressable style={styles.actionButton} onPress={handleCreate} disabled={creating || !name.trim()}>
                  <Text style={styles.actionButtonText}>{creating ? '...' : 'Erstellen'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Liga beitreten</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  placeholder="Beitrittscode"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="characters"
                  value={code}
                  onChangeText={setCode}
                />
                <Pressable style={styles.actionButton} onPress={handleJoin} disabled={joining || !code.trim()}>
                  <Text style={styles.actionButtonText}>{joining ? '...' : 'Beitreten'}</Text>
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.sectionTitle}>Deine Ligen</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.leagueRow} onPress={() => router.push(`/leagues/${item.id}`)}>
            <View>
              <Text style={styles.leagueName}>{item.name}</Text>
              <Text style={styles.leagueCode}>Code: {item.code}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="Noch keine private Liga" subtitle="Erstelle eine oder tritt mit einem Code bei." /> : null}
      />
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
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formLabel: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.white,
  },
  actionButton: { justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.red },
  actionButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  error: { color: colors.danger, fontSize: fontSizes.sm, marginBottom: spacing.md },
  sectionTitle: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md, marginBottom: spacing.sm },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  leagueName: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  leagueCode: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
});
