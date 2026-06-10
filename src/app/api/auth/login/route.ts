import { NextRequest, NextResponse } from 'next/server';
import { createMockToken, findUserByEmail, toPublicUser } from '@/lib/auth/mockStore';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = createMockToken(user.email);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: toPublicUser(user),
          token,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
