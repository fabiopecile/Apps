import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

async function readAsArrayBuffer(localUri: string): Promise<{ arrayBuffer: ArrayBuffer; extension: string }> {
  if (Platform.OS === 'web') {
    // expo-file-system's File/Directory API targets native file:// paths; on
    // web the image picker returns a blob: URL, so read it via fetch instead.
    const response = await fetch(localUri);
    const blob = await response.blob();
    return { arrayBuffer: await blob.arrayBuffer(), extension: `.${blob.type.split('/')[1] ?? 'jpg'}` };
  }
  const file = new File(localUri);
  return { arrayBuffer: await file.arrayBuffer(), extension: file.extension || '.jpg' };
}

async function upload(bucket: string, localUri: string, userId: string): Promise<string> {
  const { arrayBuffer, extension } = await readAsArrayBuffer(localUri);
  const path = `${userId}/${Date.now()}${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: `image/${extension.replace('.', '') || 'jpeg'}`,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const uploadImage = (localUri: string, userId: string) => upload('post-images', localUri, userId);
export const uploadAvatar = (localUri: string, userId: string) => upload('avatars', localUri, userId);
