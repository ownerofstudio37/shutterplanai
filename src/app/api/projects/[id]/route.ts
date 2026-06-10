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
      return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 });
    }

    const payload = await request.json();
    const admin = createSupabaseAdminClient();

    const { data: existingProject, error: existingError } = await admin
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (existingError || !existingProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('projects')
      .update({
        title: typeof payload.title === 'string' ? payload.title.trim() : undefined,
        description: typeof payload.description === 'string' ? payload.description.trim() : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
        start_date: typeof payload.startDate === 'string' ? payload.startDate : undefined,
        end_date: typeof payload.endDate === 'string' ? payload.endDate : null,
        tags: Array.isArray(payload.tags) ? payload.tags : undefined,
      })
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select('id, title, description, status, start_date, end_date, tags, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('projects').delete().eq('id', id).eq('user_id', auth.userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Project deleted' }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
  }
}
