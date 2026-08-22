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

// Crops to the rectangle the user framed. If the manipulator fails for any
// reason we hand back the original rather than blocking the post - a wrong
// crop is better than a lost photo.
export async function cropImage(uri: string, rect: CropRect): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri).crop({
      originX: Math.max(0, Math.round(rect.originX)),
      originY: Math.max(0, Math.round(rect.originY)),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri;
  }
}
