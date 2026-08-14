import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

const BUCKET = 'post-images';

export async function uploadImage(localUri: string, userId: string): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  let extension: string;

  if (Platform.OS === 'web') {
    // expo-file-system's File/Directory API targets native file:// paths; on
    // web the image picker returns a blob: URL, so read it via fetch instead.
    const response = await fetch(localUri);
    const blob = await response.blob();
    arrayBuffer = await blob.arrayBuffer();
    extension = `.${blob.type.split('/')[1] ?? 'jpg'}`;
  } else {
    const file = new File(localUri);
    arrayBuffer = await file.arrayBuffer();
    extension = file.extension || '.jpg';
  }

  const path = `${userId}/${Date.now()}${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: `image/${extension.replace('.', '') || 'jpeg'}`,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
