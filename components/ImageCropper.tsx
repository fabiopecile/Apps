import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Pressable, PanResponder, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageSize, cropImage, type CropRect } from '@/lib/imageCrop';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';

export const ASPECT_OPTIONS = [
  { key: 'square', label: '1:1', ratio: 1 },
  { key: 'portrait', label: '4:5', ratio: 4 / 5 },
  { key: 'landscape', label: '16:9', ratio: 16 / 9 },
] as const;

const MAX_ZOOM = 3;

export interface CroppedImage {
  uri: string;
  aspectRatio: number;
}

interface ImageCropperProps {
  uris: string[];
  onDone: (images: CroppedImage[]) => void;
  onCancel: () => void;
}

// Instagram-style framing: pick one format for the whole post, then drag and
// zoom each photo inside that frame. What you see in the frame is exactly what
// gets uploaded - the crop is applied to the file, not just to the preview.
export function ImageCropper({ uris, onDone, onCancel }: ImageCropperProps) {
  const [aspectIndex, setAspectIndex] = useState(1); // 4:5 by default, like the old fixed format
  const [current, setCurrent] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [results, setResults] = useState<CroppedImage[]>([]);
  const [busy, setBusy] = useState(false);

  const aspect = ASPECT_OPTIONS[aspectIndex].ratio;
  const uri = uris[current];

  // Live values for the pan/zoom responders, which can't read fresh state.
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  offsetRef.current = offset;
  zoomRef.current = zoom;

  const frameHeight = frameWidth > 0 ? frameWidth / aspect : 0;

  const layout = useMemo(() => {
    if (!imageSize || frameWidth === 0) return null;
    const base = Math.max(frameWidth / imageSize.width, frameHeight / imageSize.height);
    const scale = base * zoom;
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;
    return {
      scale,
      displayWidth,
      displayHeight,
      maxOffsetX: Math.max(0, (displayWidth - frameWidth) / 2),
      maxOffsetY: Math.max(0, (displayHeight - frameHeight) / 2),
    };
  }, [imageSize, frameWidth, frameHeight, zoom]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    let cancelled = false;
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    getImageSize(uri)
      .then((size) => {
        if (!cancelled) setImageSize(size);
      })
      .catch(() => {
        if (!cancelled) setImageSize({ width: 1000, height: 1000 });
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // Re-clamp when the frame shape or zoom changes, so the image can never
  // leave a gap at an edge.
  useEffect(() => {
    if (!layout) return;
    setOffset((prev) => ({
      x: Math.max(-layout.maxOffsetX, Math.min(layout.maxOffsetX, prev.x)),
      y: Math.max(-layout.maxOffsetY, Math.min(layout.maxOffsetY, prev.y)),
    }));
  }, [layout]);

  const panStart = useRef({ x: 0, y: 0 });
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderWidthRef = useRef(0);
  sliderWidthRef.current = sliderWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panStart.current = { ...offsetRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        const l = layoutRef.current;
        if (!l) return;
        setOffset({
          x: Math.max(-l.maxOffsetX, Math.min(l.maxOffsetX, panStart.current.x + gesture.dx)),
          y: Math.max(-l.maxOffsetY, Math.min(l.maxOffsetY, panStart.current.y + gesture.dy)),
        });
      },
    })
  ).current;

  const zoomResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const width = sliderWidthRef.current;
        if (width > 0) setZoom(1 + Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) * (MAX_ZOOM - 1));
      },
      onPanResponderMove: (e) => {
        const width = sliderWidthRef.current;
        if (width > 0) setZoom(1 + Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) * (MAX_ZOOM - 1));
      },
    })
  ).current;

  const buildCropRect = (): CropRect | null => {
    if (!imageSize || !layout) return null;
    const { scale, displayWidth, displayHeight } = layout;
    const originX = (displayWidth - frameWidth) / 2 - offset.x;
    const originY = (displayHeight - frameHeight) / 2 - offset.y;
    return {
      originX: Math.max(0, originX / scale),
      originY: Math.max(0, originY / scale),
      width: Math.min(imageSize.width, frameWidth / scale),
      height: Math.min(imageSize.height, frameHeight / scale),
    };
  };

  const handleNext = async () => {
    const rect = buildCropRect();
    if (!rect) return;
    setBusy(true);
    const croppedUri = await cropImage(uri, rect);
    const nextResults = [...results, { uri: croppedUri, aspectRatio: aspect }];
    setBusy(false);

    if (current + 1 < uris.length) {
      setResults(nextResults);
      setCurrent(current + 1);
    } else {
      onDone(nextResults);
    }
  };

  const zoomRatio = (zoom - 1) / (MAX_ZOOM - 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>
          Zuschneiden{uris.length > 1 ? ` (${current + 1}/${uris.length})` : ''}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.frameWrap} onLayout={(e: LayoutChangeEvent) => setFrameWidth(e.nativeEvent.layout.width)}>
        {frameWidth > 0 ? (
          <View style={[styles.frame, { width: frameWidth, height: frameHeight }]} {...panResponder.panHandlers}>
            {imageSize && layout ? (
              <Image
                source={{ uri }}
                style={{
                  position: 'absolute',
                  width: layout.displayWidth,
                  height: layout.displayHeight,
                  left: (frameWidth - layout.displayWidth) / 2 + offset.x,
                  top: (frameHeight - layout.displayHeight) / 2 + offset.y,
                }}
              />
            ) : null}

            <View pointerEvents="none" style={styles.gridOverlay}>
              <View style={[styles.gridLine, styles.gridLineV, { left: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineV, { left: '66.66%' }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: '66.66%' }]} />
            </View>
          </View>
        ) : null}
      </View>

      <Text style={styles.hint}>Zum Verschieben ziehen</Text>

      <View style={styles.zoomRow}>
        <Ionicons name="remove" size={18} color={colors.textMuted} />
        <View
          style={styles.zoomTrack}
          onLayout={(e: LayoutChangeEvent) => setSliderWidth(e.nativeEvent.layout.width)}
          {...zoomResponder.panHandlers}
        >
          <View style={[styles.zoomFill, { width: `${zoomRatio * 100}%` }]} />
          <View style={[styles.zoomKnob, { left: `${zoomRatio * 100}%` }]} />
        </View>
        <Ionicons name="add" size={18} color={colors.textMuted} />
      </View>

      <View style={styles.aspectRow}>
        {ASPECT_OPTIONS.map((option, i) => (
          <Pressable
            key={option.key}
            style={[styles.aspectButton, i === aspectIndex && styles.aspectButtonActive]}
            onPress={() => setAspectIndex(i)}
            disabled={current > 0} // all photos in one post share a format
          >
            <Text style={[styles.aspectText, i === aspectIndex && styles.aspectTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {current > 0 ? <Text style={styles.lockHint}>Format gilt für alle Fotos dieses Beitrags</Text> : null}

      <Pressable
        style={[styles.confirmButton, (busy || !imageSize) && styles.confirmButtonDisabled]}
        onPress={handleNext}
        disabled={busy || !imageSize}
      >
        <Text style={styles.confirmText}>
          {busy ? 'Wird zugeschnitten...' : current + 1 < uris.length ? 'Weiter' : 'Übernehmen'}
        </Text>
      </Pressable>
    </View>
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
  },
  title: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
  frameWrap: { paddingHorizontal: spacing.lg },
  frame: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.28)' },
  gridLineV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridLineH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.md },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  zoomTrack: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
  },
  zoomFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.red,
  },
  zoomKnob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    backgroundColor: colors.white,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  aspectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  aspectButtonActive: { backgroundColor: colors.red, borderColor: colors.red },
  aspectText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.sm },
  aspectTextActive: { color: colors.white },
  lockHint: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.sm },
  confirmButton: {
    margin: spacing.lg,
    marginTop: 'auto',
    backgroundColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmText: { color: colors.white, fontWeight: '800', fontSize: fontSizes.md },
});
