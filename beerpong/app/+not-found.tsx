import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GridBackground } from '@/components/ui/GridBackground';
import { colors, fonts, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nicht gefunden', headerShown: false }} />
      <View style={styles.container}>
        <GridBackground />
        <Text style={styles.title}>404</Text>
        <Text style={styles.body}>Diese Seite existiert nicht.</Text>
        <Link href="/(tabs)/camera" style={styles.link}>
          <Text style={styles.linkText}>Zurück zum Tracker</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.numeric,
    fontSize: 48,
    color: colors.neon,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    fontFamily: fonts.label,
    color: colors.neon,
    fontSize: 14,
  },
});
