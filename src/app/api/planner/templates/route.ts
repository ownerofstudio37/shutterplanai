import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

interface SessionTemplatePayload {
  sessionCategory?: string;
  locations?: Array<{ name: string; latitude?: number; longitude?: number; preferredTimeWindow?: string }>;
  constraints?: {
    shootDate?: string;
    durationMinutes?: number;
    maxTravelMinutes?: number;
  };
  [key: string]: unknown;
}

interface CreateTemplateBody {
  name?: string;
  templatePayload?: SessionTemplatePayload;
}

export async function GET(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/templates', 'GET');
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('session_templates')
      .select('id, name, template_payload, created_at, updated_at')
      .eq('user_id', authResult.userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'query_templates' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to load session templates' }, { status: 500 });
    }

    apiSuccess(requestContext, 200, { count: data?.length ?? 0 });
    return jsonWithApiMeta(requestContext, { success: true, data: data ?? [] });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to load session templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestContext = startApiRequest('/api/planner/templates', 'POST');
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(requestContext, { success: false, error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = (await request.json()) as CreateTemplateBody;
    const name = body.name?.trim();

    if (!name || name.length === 0) {
      apiFailure(requestContext, 400, 'Template name is required', { stage: 'validation' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Template name is required' }, { status: 400 });
    }

    if (name.length > 120) {
      apiFailure(requestContext, 400, 'Template name must be 120 characters or less', { stage: 'validation' });
      return jsonWithApiMeta(
        requestContext,
        { success: false, error: 'Template name must be 120 characters or less' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('session_templates')
      .insert({
        user_id: authResult.userId,
        name,
        template_payload: body.templatePayload ?? {},
      })
      .select('id, name, template_payload, created_at, updated_at')
      .single();

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'create_template' });
      return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to create session template' }, { status: 500 });
    }

    apiSuccess(requestContext, 201, { templateId: data.id });
    return jsonWithApiMeta(requestContext, { success: true, data }, { status: 201 });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(requestContext, { success: false, error: 'Failed to create session template' }, { status: 500 });
  }
}
