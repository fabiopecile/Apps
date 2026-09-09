import type { CupSample } from './cupVision';
import type { FrameSampler, SampleRegion } from './frameSampler';

export type { FrameSampler, SampleRegion };

export const FRAME_SAMPLING_SUPPORTED = true;

/** Preview is drawn down to this width before sampling — plenty for patch averages. */
const WORK_WIDTH = 320;

/**
 * Reads the camera preview and reduces each cup's patch to a few numbers.
 *
 * expo-camera renders a real `<video>` element on the web, so the preview can
 * be drawn into an offscreen canvas and read back. The frame is scaled down
 * hard first: a patch average does not need detail, and this keeps the whole
 * pass cheap enough to run several times a second on a phone browser.
 *
 * Regions arrive as fractions of what the user sees. That is deliberately not
 * the same thing as fractions of the video: the preview is `object-fit:
 * cover`, so part of the frame is cropped away off-screen. Skipping that
 * conversion puts every sample in the wrong place, worse the further the
 * aspect ratios diverge.
 */
export function createFrameSampler(): FrameSampler | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  let video: HTMLVideoElement | null = null;

  /** The preview belongs to expo-camera, so it is found rather than created. */
  const findVideo = (): HTMLVideoElement | null => {
    if (video && video.isConnected && video.readyState >= 2) return video;
    const candidates = Array.from(document.querySelectorAll('video'));
    video = candidates.find((element) => element.readyState >= 2 && element.videoWidth > 0) ?? null;
    return video;
  };

  return {
    sample(regions: SampleRegion[]): CupSample[] | null {
      const source = findVideo();
      if (!source) return null;

      const rect = source.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;

      const width = WORK_WIDTH;
      const height = Math.max(1, Math.round((source.videoHeight / source.videoWidth) * width));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      try {
        context.drawImage(source, 0, 0, width, height);
      } catch {
        // A frame can be unavailable mid-negotiation; skip it.
        return null;
      }

      // How the video is blown up to fill the element, and how much of it
      // falls outside the visible box on each side.
      const cover = Math.max(rect.width / source.videoWidth, rect.height / source.videoHeight);
      const hiddenX = (source.videoWidth * cover - rect.width) / 2;
      const hiddenY = (source.videoHeight * cover - rect.height) / 2;
      const toWork = width / source.videoWidth;
      const mirrored = isMirrored(source);

      return regions.map((region) => {
        // A mirrored preview is a CSS transform; drawImage still hands over
        // the unflipped frame. Without undoing it here, every ring would
        // measure the cup opposite the one it sits on.
        const displayX = mirrored ? (1 - region.x) * rect.width : region.x * rect.width;
        const centreX = ((displayX + hiddenX) / cover) * toWork;
        const centreY = ((region.y * rect.height + hiddenY) / cover) * toWork;
        const radius = ((region.radius * rect.width) / cover) * toWork;
        return readPatch(context, width, height, centreX, centreY, radius);
      });
    },

    dispose() {
      video = null;
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/**
 * Whether the preview is flipped horizontally.
 *
 * Front cameras are shown mirrored so they read like a mirror, and expo-camera
 * does that with a CSS transform. Read rather than assumed, so a back camera —
 * which is not flipped — keeps sampling straight through.
 */
function isMirrored(video: HTMLVideoElement): boolean {
  const transform = getComputedStyle(video).transform;
  if (!transform || transform === 'none') return false;
  const values = transform
    .slice(transform.indexOf('(') + 1, transform.lastIndexOf(')'))
    .split(',')
    .map((part) => Number(part.trim()));
  // matrix(a, …) and matrix3d(a, …) both start with the horizontal scale.
  return Number.isFinite(values[0]) && values[0] < 0;
}

/** Mean colour plus a cheap texture measure over one square patch. */
function readPatch(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centreX: number,
  centreY: number,
  radius: number
): CupSample {
  const half = Math.max(2, Math.round(radius));
  const left = Math.max(0, Math.min(width - 1, Math.round(centreX) - half));
  const top = Math.max(0, Math.min(height - 1, Math.round(centreY) - half));
  const right = Math.max(left + 1, Math.min(width, Math.round(centreX) + half));
  const bottom = Math.max(top + 1, Math.min(height, Math.round(centreY) + half));
  const boxWidth = right - left;
  const boxHeight = bottom - top;

  const { data } = context.getImageData(left, top, boxWidth, boxHeight);

  let r = 0;
  let g = 0;
  let b = 0;
  let contrast = 0;
  let contrastSamples = 0;

  for (let y = 0; y < boxHeight; y++) {
    for (let x = 0; x < boxWidth; x++) {
      const i = (y * boxWidth + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];

      // Difference to the pixel on the right, as a stand-in for edge energy:
      // a cup's rim scores high, bare table scores near zero.
      if (x + 1 < boxWidth) {
        const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const j = i + 4;
        const nextLuma = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
        contrast += Math.abs(luma - nextLuma);
        contrastSamples += 1;
      }
    }
  }

  const pixels = boxWidth * boxHeight;
  return {
    r: r / pixels,
    g: g / pixels,
    b: b / pixels,
    contrast: contrastSamples > 0 ? contrast / contrastSamples : 0,
  };
}
