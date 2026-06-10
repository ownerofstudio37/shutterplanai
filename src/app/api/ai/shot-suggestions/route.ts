import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { generateShotSuggestions } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { projectId, creativeBrief } = await request.json();

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ success: false, error: 'Project id is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id, title, description, status')
      .eq('id', projectId)
      .eq('user_id', auth.userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { data: existingShots, error: shotsError } = await admin
      .from('shots')
      .select('title, description, location, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (shotsError) {
      return NextResponse.json({ success: false, error: shotsError.message }, { status: 400 });
    }

    const suggestions = await generateShotSuggestions({
      project,
      existingShots: existingShots ?? [],
      creativeBrief: typeof creativeBrief === 'string' ? creativeBrief : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: suggestions,
        isUsingFallback: suggestions.length > 0 && !process.env.GEMINI_API_KEY,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate shot suggestions';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
