import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookies,
  createServerSupabaseClient,
  getAuthenticatedRequestContext,
} from '@/lib/server/supabase-auth';

export async function GET(request: NextRequest) {
  const sharedReportPath = process.env.GLOBAL_REPORT_FILE_PATH?.trim();
  const sharedReportTitle = process.env.GLOBAL_REPORT_TITLE?.trim() || 'Shared Report';

  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }
  const supabase = createServerSupabaseClient(authContext.accessToken);

  // Shared mode: one report available to every authenticated user.
  if (sharedReportPath) {
    const response = NextResponse.json({
      hasReport: true,
      title: sharedReportTitle,
    });
    if (authContext.refreshedSession) {
      applySessionCookies(response, authContext.refreshedSession);
    }
    return response;
  }

  const { data: reports, error: reportError } = await supabase
    .from('user_reports')
    .select('title')
    .eq('user_id', authContext.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  const activeReport = reports?.[0];
  const response = NextResponse.json({
    hasReport: Boolean(activeReport),
    title: activeReport?.title ?? null,
  });
  if (authContext.refreshedSession) {
    applySessionCookies(response, authContext.refreshedSession);
  }
  return response;
}
