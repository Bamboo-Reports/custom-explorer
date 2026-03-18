import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookies,
  clearSessionCookies,
  createServerSupabaseClient,
  getAuthenticatedRequestContext,
} from '@/lib/server/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      const response = NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const userClient = createServerSupabaseClient(authContext.accessToken);
    const profileResponse = await userClient
      .from('profiles')
      .select('full_name')
      .eq('id', authContext.user.id)
      .maybeSingle();

    const profileData = profileResponse.data as { full_name?: string | null } | null;
    const metadataName =
      authContext.user.user_metadata?.full_name ||
      authContext.user.user_metadata?.fullName;
    const fullName =
      typeof profileData?.full_name === 'string' && profileData.full_name.trim()
        ? profileData.full_name.trim()
        : typeof metadataName === 'string' && metadataName.trim()
          ? metadataName.trim()
          : '';

    const response = NextResponse.json({
      user: {
        id: authContext.user.id,
        email: authContext.user.email || '',
        fullName,
      },
    });

    if (authContext.refreshedSession) {
      applySessionCookies(response, authContext.refreshedSession);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load session.' },
      { status: 500 }
    );
  }
}
