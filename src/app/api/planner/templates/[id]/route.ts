import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { apiFailure, apiSuccess, jsonWithApiMeta, startApiRequest } from '@/lib/utils/apiObservability';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestContext = startApiRequest('/api/planner/templates/[id]', 'DELETE');
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    apiFailure(requestContext, authResult.status, authResult.error, { stage: 'auth' });
    return jsonWithApiMeta(
      requestContext,
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      apiFailure(requestContext, 400, 'Template ID is required', { stage: 'validation' });
      return jsonWithApiMeta(
        requestContext,
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('session_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', authResult.userId);

    if (error) {
      apiFailure(requestContext, 500, error, { stage: 'delete_template' });
      return jsonWithApiMeta(
        requestContext,
        { success: false, error: 'Failed to delete session template' },
        { status: 500 }
      );
    }

    apiSuccess(requestContext, 200, { id });
    return jsonWithApiMeta(requestContext, { success: true });
  } catch (error) {
    apiFailure(requestContext, 500, error, { stage: 'unhandled' });
    return jsonWithApiMeta(
      requestContext,
      { success: false, error: 'Failed to delete session template' },
      { status: 500 }
    );
  }
}
