import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/serverAuth';

const BASE_SELECT =
  'id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at, projects!inner(id, title, user_id)';

const EXTENDED_SELECT =
  'id, project_id, title, description, location, planned_time, status, notes, image_url, latitude, longitude, micro_spot_name, parking_notes, background_description, walking_distance, restroom_location, created_at, updated_at, projects!inner(id, title, user_id)';

type RelatedProject = { title?: string } | Array<{ title?: string }> | null;

type ShotRow = Record<string, unknown> & {
  projects?: RelatedProject;
};

function toNullableTrimmedString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingColumnError(error?: { message?: string; code?: string | null }) {
  if (!error) return false;

  if (error.code === 'PGRST204' || error.code === '42703') {
    return true;
  }

  const message = error.message ?? '';
  return /(column .* does not exist|schema cache|could not find the .* column)/i.test(message);
}

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
      .select(EXTENDED_SELECT)
      .eq('projects.user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const primaryResult = await query;
    let data: Array<Record<string, unknown>> | null = primaryResult.data as Array<Record<string, unknown>> | null;
    let error = primaryResult.error;

    if (error && isMissingColumnError(error)) {
      let fallbackQuery = admin
        .from('shots')
        .select(BASE_SELECT)
        .eq('projects.user_id', auth.userId)
        .order('created_at', { ascending: false });

      if (projectId) {
        fallbackQuery = fallbackQuery.eq('project_id', projectId);
      }

      const fallback = await fallbackQuery;
      data = fallback.data as Array<Record<string, unknown>> | null;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const normalized = (data ?? []).map(item => {
      const row = item as ShotRow;
      const relatedProject = row.projects ?? null;
      const projectTitle = Array.isArray(relatedProject)
        ? relatedProject[0]?.title
        : relatedProject?.title;

      return {
        id: row.id,
        project_id: row.project_id,
        title: row.title,
        description: row.description,
        location: row.location,
        planned_time: row.planned_time,
        status: row.status,
        notes: row.notes,
        image_url: row.image_url,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        micro_spot_name: row.micro_spot_name ?? null,
        parking_notes: row.parking_notes ?? null,
        background_description: row.background_description ?? null,
        walking_distance: row.walking_distance ?? null,
        restroom_location: row.restroom_location ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
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

    const payload = await request.json();
    const {
      projectId,
      title,
      description,
      location,
      plannedTime,
      notes,
      status,
      latitude,
      longitude,
      microSpotName,
      parkingNotes,
      backgroundDescription,
      walkingDistance,
      restroomLocation,
    } = payload;

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

    const baseInsert = {
      project_id: projectId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      location: typeof location === 'string' ? location.trim() : null,
      planned_time: typeof plannedTime === 'string' ? plannedTime : null,
      notes: typeof notes === 'string' ? notes.trim() : '',
      status: typeof status === 'string' ? status : 'planned',
    };

    const extendedInsert = {
      ...baseInsert,
      latitude: toNullableNumber(latitude),
      longitude: toNullableNumber(longitude),
      micro_spot_name: toNullableTrimmedString(microSpotName),
      parking_notes: toNullableTrimmedString(parkingNotes),
      background_description: toNullableTrimmedString(backgroundDescription),
      walking_distance: toNullableTrimmedString(walkingDistance),
      restroom_location: toNullableTrimmedString(restroomLocation),
    };

    const primaryInsert = await admin
      .from('shots')
      .insert(extendedInsert)
      .select(
        'id, project_id, title, description, location, planned_time, status, notes, image_url, latitude, longitude, micro_spot_name, parking_notes, background_description, walking_distance, restroom_location, created_at, updated_at'
      )
      .single();

    let data: Record<string, unknown> | null = primaryInsert.data as Record<string, unknown> | null;
    let error = primaryInsert.error;

    if (error && isMissingColumnError(error)) {
      const fallback = await admin
        .from('shots')
        .insert(baseInsert)
        .select('id, project_id, title, description, location, planned_time, status, notes, image_url, created_at, updated_at')
        .single();
      data = fallback.data as Record<string, unknown> | null;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create shot' }, { status: 500 });
  }
}
