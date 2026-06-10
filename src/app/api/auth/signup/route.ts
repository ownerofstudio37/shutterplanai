import { NextRequest, NextResponse } from 'next/server';
import { createMockToken, createUser, findUserByEmail } from '@/lib/auth/mockStore';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (findUserByEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 400 }
      );
    }

    const user = createUser(email, password, name);
    const token = createMockToken(user.email);

    return NextResponse.json(
      {
        success: true,
        data: { user, token },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Signup failed' },
      { status: 500 }
    );
  }
}
