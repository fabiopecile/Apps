import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GridBackground } from '@/components/ui/GridBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { GlowButton } from '@/components/ui/GlowButton';
import { ParticleBurst, type ParticleBurstHandle } from '@/components/ui/ParticleBurst';
import { FlashOverlay, type FlashOverlayHandle } from '@/components/ui/FlashOverlay';
import { HouseRulesPanel } from '@/components/camera/HouseRulesPanel';
import { useBeerpongStore } from '@/lib/store';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, spacing } from '@/theme';

export default function CameraTrackerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [rulesVisible, setRulesVisible] = useState(false);
  const score = useBeerpongStore((s) => s.camera.score);
  const streak = useBeerpongStore((s) => s.camera.streak);
  const cameraHit = useBeerpongStore((s) => s.cameraHit);
  const cameraMiss = useBeerpongStore((s) => s.cameraMiss);
  const cameraResetGame = useBeerpongStore((s) => s.cameraResetGame);
  const feedback = useFeedback();
  const flashRef = useRef<FlashOverlayHandle>(null);
  const particleRef = useRef<ParticleBurstHandle>(null);

  const handleHit = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    cameraHit();
    feedback.cupHit();
    flashRef.current?.flash(colors.neon);
    particleRef.current?.burst(locationX, locationY);
    if ((streak + 1) % 5 === 0) {
      feedback.streak();
    }
  };

  const handleMiss = () => {
    cameraMiss();
    feedback.miss();
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <GridBackground />
        <SafeAreaView style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera" size={40} color={colors.neon} />
          </View>
          <Text style={styles.permissionTitle}>Kamera-Zugriff nötig</Text>
          <Text style={styles.permissionBody}>
            Beerpong nutzt die Kamera, um dein Live-Spiel zu tracken. Erlaube den Zugriff, um
            Treffer per Tap zu zählen.
          </Text>
          <GlowButton label="Kamera erlauben" onPress={requestPermission} size="lg" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleHit} />
      <ParticleBurst ref={particleRef} />
      <FlashOverlay ref={flashRef} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <ScreenHeader
          title="TRACKER"
          subtitle="Tippe irgendwo für jeden Treffer"
          right={
            <Pressable
              onPress={() => setRulesVisible(true)}
              style={styles.iconButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="House Rules öffnen"
            >
              <Ionicons name="options" size={18} color={colors.neon} />
            </Pressable>
          }
        />

        <View style={styles.center} pointerEvents="none">
          <ScoreDisplay value={score} label="Cups getroffen" />
          <View style={{ height: spacing.md }} />
          <StreakBadge streak={streak} />
        </View>

        <View style={styles.bottomBar}>
          <GlowButton
            label="Fehlwurf"
            variant="outline"
            size="sm"
            onPress={handleMiss}
            style={styles.bottomButton}
          />
          <GlowButton
            label="Neues Spiel"
            variant="ghost"
            size="sm"
            onPress={cameraResetGame}
            style={styles.bottomButton}
          />
        </View>
      </SafeAreaView>

      <HouseRulesPanel visible={rulesVisible} onClose={() => setRulesVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  bottomButton: {
    flex: 1,
    maxWidth: 180,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  permissionTitle: {
    fontFamily: fonts.headingBlack,
    fontSize: 24,
    color: colors.textPrimary,
  },
  permissionBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
