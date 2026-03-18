import { NextRequest, NextResponse } from 'next/server';
import {
  clearSessionCookies,
  createServerSupabaseClient,
} from '@/lib/server/supabase-auth';

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('br_access_token')?.value?.trim();

  if (accessToken) {
    try {
      const supabase = createServerSupabaseClient(accessToken);
      await supabase.auth.signOut();
    } catch {
      // Clear cookies even if remote sign-out fails.
    }
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
