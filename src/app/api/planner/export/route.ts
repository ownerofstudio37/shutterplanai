import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, planMetadata } = body as { plan: Record<string, unknown>; planMetadata: Record<string, unknown> };
    const token = request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shareToken = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from('planner_exports').insert({
      share_token: shareToken,
      plan_data: plan,
      metadata: planMetadata,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/plans/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('planner_exports')
      .select('plan_data, metadata')
      .eq('share_token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Plan not found or expired' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Share fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}
