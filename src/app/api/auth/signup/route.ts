import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureUserProfile, toAppUser } from '@/lib/auth/supabaseUser';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: createUserData, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createUserError || !createUserData.user) {
      return NextResponse.json(
        {
          success: false,
          error: createUserError?.message ?? 'Could not create account',
        },
        { status: 400 }
      );
    }

    await ensureUserProfile(createUserData.user);

    const supabase = createSupabaseServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user || !signInData.session) {
      return NextResponse.json(
        { success: false, error: signInError?.message ?? 'Signup succeeded but login failed' },
        { status: 400 }
      );
    }

    const profile = await ensureUserProfile(signInData.user);
    const appUser = toAppUser(signInData.user, profile);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: appUser,
          token: signInData.session.access_token,
        },
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
