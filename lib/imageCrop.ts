import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

// Phone cameras shoot around 4000px wide. That photo gets displayed in a
// column a few hundred points across, so everything above this is bandwidth
// nobody can see - and it is the feed's images, not the queries, that would
// exhaust a Supabase bandwidth quota first. 1440 still covers a 3x phone
// screen at full width.
const MAX_UPLOAD_WIDTH = 1440;

// Avatars are the most-fetched images in the app - one per feed row, per
// leaderboard entry, per comment - and the largest they ever render is 96pt.
export const MAX_AVATAR_WIDTH = 512;

// Crops to the rectangle the user framed, then scales the result down. If the
// manipulator fails for any reason we hand back the original rather than
// blocking the post - a wrong crop is better than a lost photo.
export async function cropImage(uri: string, rect: CropRect, maxWidth = MAX_UPLOAD_WIDTH): Promise<string> {
  try {
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    let context = ImageManipulator.manipulate(uri).crop({
      originX: Math.max(0, Math.round(rect.originX)),
      originY: Math.max(0, Math.round(rect.originY)),
      width,
      height,
    });

    // Only ever scale down - blowing a small photo up would add bytes without
    // adding detail. Height follows the ratio automatically.
    if (width > maxWidth) {
      context = context.resize({ width: maxWidth });
    }

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri;
  }
}
