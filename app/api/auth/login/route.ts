import { NextRequest, NextResponse } from 'next/server';
import { applySessionCookies, createServerSupabaseClient } from '@/lib/server/supabase-auth';

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: error?.message || 'Invalid credentials.' }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email || email,
      },
    });

    applySessionCookies(response, data.session);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in.' },
      { status: 500 }
    );
  }
}
