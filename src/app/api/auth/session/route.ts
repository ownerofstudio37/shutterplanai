import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, toPublicUser } from '@/lib/auth/mockStore';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing auth token' },
      { status: 401 }
    );
  }

  const user = getUserFromToken(token);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, data: toPublicUser(user) }, { status: 200 });
}