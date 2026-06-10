import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';

// Mock user database - replace with real database
const users: Record<string, User & { password: string }> = {};

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (users[email]) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 400 }
      );
    }

    // Mock token generation
    const token = Buffer.from(
      JSON.stringify({
        email,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      })
    ).toString('base64');

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users[email] = { ...user, password };

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
