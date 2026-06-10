import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');

    const admin = createSupabaseAdminClient();
    let query = admin
      .from('shots')
      .select(
        'id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at, projects!inner(id, title, user_id)'
      )
      .eq('projects.user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const normalized = (data ?? []).map(item => {
      const relatedProject = item.projects as { title?: string } | Array<{ title?: string }> | null;
      const projectTitle = Array.isArray(relatedProject)
        ? relatedProject[0]?.title
        : relatedProject?.title;

      return {
      id: item.id,
      project_id: item.project_id,
      title: item.title,
      description: item.description,
      location: item.location,
      planned_time: item.planned_time,
      status: item.status,
      notes: item.notes,
      image_url: item.image_url,
      created_at: item.created_at,
      updated_at: item.updated_at,
      project_title: projectTitle,
      };
    });

    return NextResponse.json({ success: true, data: normalized }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load shots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { projectId, title, description, location, plannedTime, notes, status } = await request.json();

    if (!projectId || !title) {
      return NextResponse.json(
        { success: false, error: 'Project and shot title are required' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', auth.userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('shots')
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        location: typeof location === 'string' ? location.trim() : null,
        planned_time: typeof plannedTime === 'string' ? plannedTime : null,
        notes: typeof notes === 'string' ? notes.trim() : '',
        status: typeof status === 'string' ? status : 'planned',
      })
      .select('id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create shot' }, { status: 500 });
  }
}
