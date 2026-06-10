import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/serverAuth';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Shot id is required' }, { status: 400 });
    }

    const payload = await request.json();
    const admin = createSupabaseAdminClient();

    const { data: shot, error: shotError } = await admin
      .from('shots')
      .select('id, project_id')
      .eq('id', id)
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

    const { data, error } = await admin
      .from('shots')
      .update({
        title: typeof payload.title === 'string' ? payload.title.trim() : undefined,
        description: typeof payload.description === 'string' ? payload.description.trim() : undefined,
        location: typeof payload.location === 'string' ? payload.location.trim() : null,
        planned_time: typeof payload.plannedTime === 'string' ? payload.plannedTime : null,
        notes: typeof payload.notes === 'string' ? payload.notes.trim() : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
      })
      .eq('id', id)
      .select('id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update shot' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Shot id is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: shot, error: shotError } = await admin
      .from('shots')
      .select('id, project_id')
      .eq('id', id)
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

    const { error } = await admin.from('shots').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Shot deleted' }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete shot' }, { status: 500 });
  }
}
