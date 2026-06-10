import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('projects')
      .select('id, title, description, status, start_date, end_date, tags, created_at, updated_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { title, description, status, startDate, endDate, tags } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'Project title is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('projects')
      .insert({
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status: typeof status === 'string' ? status : 'draft',
        user_id: auth.userId,
        start_date: typeof startDate === 'string' ? startDate : new Date().toISOString(),
        end_date: typeof endDate === 'string' ? endDate : null,
        tags: Array.isArray(tags) ? tags : [],
      })
      .select('id, title, description, status, start_date, end_date, tags, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}
