import { createSupabaseAdminClient } from '@/lib/supabase/server';

const SHOT_IMAGES_BUCKET = 'shot-images';

export async function ensureShotImagesBucket() {
  const admin = createSupabaseAdminClient();

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some(bucket => bucket.name === SHOT_IMAGES_BUCKET);

  if (!exists) {
    await admin.storage.createBucket(SHOT_IMAGES_BUCKET, {
      public: true,
    });
  }

  return admin;
}

export async function uploadShotImage(file: File, shotId: string) {
  const admin = await ensureShotImagesBucket();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filePath = `${shotId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(SHOT_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = admin.storage.from(SHOT_IMAGES_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}
