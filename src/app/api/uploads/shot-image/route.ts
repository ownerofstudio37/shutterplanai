import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { uploadShotImage } from '@/lib/storage/supabaseStorage';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const shotId = formData.get('shotId');
    const file = formData.get('file');

    if (typeof shotId !== 'string' || !shotId) {
      return NextResponse.json({ success: false, error: 'Shot id is required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: shot, error: shotError } = await admin
      .from('shots')
      .select('id, project_id')
      .eq('id', shotId)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ success: false, error: 'Shot not found' }, { status: 404 });
    }

    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id')
      .eq('id', shot.project_id)
      .eq('user_id', auth.userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const imageUrl = await uploadShotImage(file, shotId);

    const { data, error } = await admin
      .from('shots')
      .update({ image_url: imageUrl })
      .eq('id', shotId)
      .select('id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
