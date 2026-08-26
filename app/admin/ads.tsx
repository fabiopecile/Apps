import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { confirmDestructive } from '@/lib/confirm';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Ad, AdPlacement, AdStats } from '@/lib/database.types';

const PLACEMENTS: { key: AdPlacement; label: string }[] = [
  { key: 'both', label: 'Beides' },
  { key: 'feed', label: 'Nur Feed' },
  { key: 'story', label: 'Nur Story' },
];

export default function AdminAdsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState<Record<string, AdStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advertiser, setAdvertiser] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Mehr erfahren');
  const [placement, setPlacement] = useState<AdPlacement>('both');

  const load = useCallback(async () => {
    const [{ data: adRows }, { data: statRows }] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.rpc('ad_stats'),
    ]);
    setAds((adRows as Ad[]) ?? []);
    setStats(
      Object.fromEntries(((statRows as AdStats[]) ?? []).map((s) => [s.ad_id, s]))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile?.is_admin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.denied}>Kein Zugriff.</Text>
      </SafeAreaView>
    );
  }
  if (loading) return <LoadingScreen />;

  const canSave = advertiser.trim() && imageUrl.trim() && targetUrl.trim();

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('ads').insert({
      advertiser_name: advertiser.trim(),
      image_url: imageUrl.trim(),
      target_url: targetUrl.trim(),
      caption: caption.trim() || null,
      cta_label: ctaLabel.trim() || 'Mehr erfahren',
      placement,
      created_by: profile.id,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAdvertiser('');
    setImageUrl('');
    setTargetUrl('');
    setCaption('');
    load();
  };

  const toggleActive = async (ad: Ad) => {
    await supabase.from('ads').update({ active: !ad.active }).eq('id', ad.id);
    load();
  };

  const handleDelete = (ad: Ad) => {
    confirmDestructive(
      'Werbung löschen?',
      `„${ad.advertiser_name}" wird endgültig entfernt, samt Statistik.`,
      'Löschen',
      async () => {
        await supabase.from('ads').delete().eq('id', ad.id);
        load();
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Werbung</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Neue Werbung</Text>

        <TextInput style={styles.input} placeholder="Firmenname" placeholderTextColor={colors.textFaint} value={advertiser} onChangeText={setAdvertiser} />
        <TextInput style={styles.input} placeholder="Bild-URL" placeholderTextColor={colors.textFaint} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Ziel-URL (wohin der Tipp führt)" placeholderTextColor={colors.textFaint} value={targetUrl} onChangeText={setTargetUrl} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Text (optional)" placeholderTextColor={colors.textFaint} value={caption} onChangeText={setCaption} />
        <TextInput style={styles.input} placeholder="Knopfbeschriftung" placeholderTextColor={colors.textFaint} value={ctaLabel} onChangeText={setCtaLabel} />

        <View style={styles.placementRow}>
          {PLACEMENTS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.placementChip, placement === p.key && styles.placementChipOn]}
              onPress={() => setPlacement(p.key)}
            >
              <Text style={[styles.placementText, placement === p.key && styles.placementTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Story-Werbung braucht ein Hochformat (9:16), Feed-Werbung am besten 4:5. Die Bild-URL muss öffentlich
          erreichbar sein – du kannst sie z. B. in Supabase Storage hochladen.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={handleCreate}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveText}>{saving ? 'Wird angelegt...' : 'Werbung anlegen'}</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Laufende Werbung</Text>

        {ads.length === 0 ? <Text style={styles.hint}>Noch keine Werbung angelegt.</Text> : null}

        {ads.map((ad) => {
          const stat = stats[ad.id];
          const clicks = stat?.clicks ?? 0;
          const impressions = stat?.impressions ?? 0;
          const rate = impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0;
          return (
            <View key={ad.id} style={styles.adRow}>
              <View style={styles.adText}>
                <Text style={styles.adName}>{ad.advertiser_name}</Text>
                <Text style={styles.adMeta}>
                  {impressions} Einblendungen · {clicks} Klicks · {rate}%
                </Text>
                <Text style={styles.adMeta}>
                  {PLACEMENTS.find((p) => p.key === ad.placement)?.label}
                </Text>
              </View>
              <Pressable style={styles.adAction} onPress={() => toggleActive(ad)}>
                <Ionicons
                  name={ad.active ? 'pause' : 'play'}
                  size={16}
                  color={ad.active ? colors.gold : colors.success}
                />
              </Pressable>
              <Pressable style={styles.adAction} onPress={() => handleDelete(ad)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}
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
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: fontSizes.md, marginBottom: spacing.sm },
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
  placementRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  placementChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
  },
  placementChipOn: { backgroundColor: colors.redDark, borderColor: colors.red },
  placementText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.xs },
  placementTextOn: { color: colors.white },
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
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  adText: { flex: 1 },
  adName: { color: colors.text, fontWeight: '700', fontSize: fontSizes.sm },
  adMeta: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  adAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
