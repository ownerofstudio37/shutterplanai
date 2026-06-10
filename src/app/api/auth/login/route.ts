import { NextRequest, NextResponse } from 'next/server';

// Mock database
const users: Record<string, { email: string; password: string; name: string; id: string }> = {};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    const user = users[email];
    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Mock token generation
    const token = Buffer.from(
      JSON.stringify({
        email,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      })
    ).toString('base64');

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
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
