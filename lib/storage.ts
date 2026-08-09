import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

const BUCKET = 'post-images';

export async function uploadImage(localUri: string, userId: string): Promise<string> {
  const file = new File(localUri);
  const arrayBuffer = await file.arrayBuffer();
  const extension = file.extension || '.jpg';
  const path = `${userId}/${Date.now()}${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: `image/${extension.replace('.', '') || 'jpeg'}`,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
