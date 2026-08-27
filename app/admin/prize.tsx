import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PrizeCard } from '@/components/PrizeCard';
import { useAuth } from '@/contexts/AuthContext';
import { currentPeriod, formatPeriod } from '@/hooks/useMonthlyRanking';
import { supabase } from '@/lib/supabase';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { MonthlyPrize } from '@/lib/database.types';

/** The current month and the next two, so a prize can be lined up ahead. */
function upcomingPeriods(): string[] {
  const now = new Date();
  return [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
}

export default function AdminPrizeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const periods = upcomingPeriods();

  const [period, setPeriod] = useState(currentPeriod());
  const [prizes, setPrizes] = useState<Record<string, MonthlyPrize>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [places, setPlaces] = useState('3');
  const [minTips, setMinTips] = useState('10');

  const load = useCallback(async () => {
    const { data } = await supabase.from('monthly_prizes').select('*').in('period', periods);
    setPrizes(Object.fromEntries(((data as MonthlyPrize[]) ?? []).map((p) => [p.period, p])));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods.join(',')]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching month loads that month's prize into the form so editing an
  // existing one is the same gesture as creating a new one.
  useEffect(() => {
    const existing = prizes[period];
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setSponsorName(existing?.sponsor_name ?? '');
    setSponsorUrl(existing?.sponsor_url ?? '');
    setImageUrl(existing?.image_url ?? '');
    setPlaces(String(existing?.places ?? 3));
    setMinTips(String(existing?.min_tips ?? 10));
  }, [period, prizes]);

  if (!profile?.is_admin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.denied}>Kein Zugriff.</Text>
      </SafeAreaView>
    );
  }
  if (loading) return <LoadingScreen />;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from('monthly_prizes').upsert({
      period,
      title: title.trim(),
      description: description.trim() || null,
      sponsor_name: sponsorName.trim() || null,
      sponsor_url: sponsorUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      places: Math.max(1, Math.min(50, Number(places) || 3)),
      min_tips: Math.max(0, Number(minTips) || 0),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    load();
  };

  const preview: MonthlyPrize = {
    period,
    title: title.trim() || 'Preis ohne Namen',
    description: description.trim() || null,
    sponsor_name: sponsorName.trim() || null,
    sponsor_url: sponsorUrl.trim() || null,
    image_url: imageUrl.trim() || null,
    places: Number(places) || 3,
    min_tips: Number(minTips) || 0,
    created_at: '',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Monatspreis</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.periodRow}>
          {periods.map((p) => (
            <Pressable
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipOn]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextOn]}>
                {formatPeriod(p).replace(/ \d{4}$/, '')}
              </Text>
              {prizes[p] ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>

        <TextInput style={styles.input} placeholder="Was gibt es zu gewinnen?" placeholderTextColor={colors.textFaint} value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, styles.multiline]} placeholder="Beschreibung (optional)" placeholderTextColor={colors.textFaint} value={description} onChangeText={setDescription} multiline />
        <TextInput style={styles.input} placeholder="Sponsor (optional)" placeholderTextColor={colors.textFaint} value={sponsorName} onChangeText={setSponsorName} />
        <TextInput style={styles.input} placeholder="Sponsor-Website (optional)" placeholderTextColor={colors.textFaint} value={sponsorUrl} onChangeText={setSponsorUrl} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Bild-URL (optional)" placeholderTextColor={colors.textFaint} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />

        <View style={styles.numberRow}>
          <View style={styles.numberField}>
            <Text style={styles.label}>Gewinnende Plätze</Text>
            <TextInput style={styles.input} value={places} onChangeText={setPlaces} keyboardType="number-pad" />
          </View>
          <View style={styles.numberField}>
            <Text style={styles.label}>Tipps nötig</Text>
            <TextInput style={styles.input} value={minTips} onChangeText={setMinTips} keyboardType="number-pad" />
          </View>
        </View>

        <Text style={styles.hint}>
          „Tipps nötig" hält Zweitkonten fern: Wer im Monat weniger getippt hat, steht zwar in der Tabelle,
          gilt aber nicht als preisberechtigt. Zehn ist ein guter Startwert – etwa ein Spieltag.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, (!title.trim() || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!title.trim() || saving}
        >
          <Text style={styles.saveText}>{saving ? 'Wird gespeichert...' : 'Preis speichern'}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>So sehen es die Nutzer</Text>
        <View style={styles.previewWrap}>
          <PrizeCard prize={preview} periodLabel={formatPeriod(period)} myTips={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  denied: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: fontSizes.xl, letterSpacing: -0.4 },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  periodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
  },
  periodChipOn: { backgroundColor: colors.redDark, borderColor: colors.red },
  periodText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  periodTextOn: { color: colors.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  numberRow: { flexDirection: 'row', gap: spacing.sm },
  numberField: { flex: 1 },
  label: { color: colors.textFaint, fontSize: fontSizes.xs, fontWeight: '600', marginBottom: spacing.xs },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs, lineHeight: 17, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: fontSizes.sm, marginTop: spacing.sm },
  saveButton: {
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: fontSizes.md, marginTop: spacing.xl },
  previewWrap: { marginHorizontal: -spacing.lg, marginTop: spacing.sm },
});
