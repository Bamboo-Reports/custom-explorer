import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookies,
  createServerSupabaseClient,
  getAuthenticatedRequestContext,
  getSupabaseServiceRoleClient,
} from '@/lib/server/supabase-auth';

export async function GET(request: NextRequest) {
  const reportsBucket = process.env.SUPABASE_REPORTS_BUCKET?.trim() || 'reports';
  const sharedReportPath = process.env.GLOBAL_REPORT_FILE_PATH?.trim();
  const sharedReportTitle = process.env.GLOBAL_REPORT_TITLE?.trim() || 'Shared Report';

  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }
  const supabase = createServerSupabaseClient(authContext.accessToken);

  let reportFilePath = sharedReportPath || '';
  let reportTitle = sharedReportTitle;

  if (!reportFilePath) {
    const { data: reports, error: reportError } = await supabase
      .from('user_reports')
      .select('title, file_path')
      .eq('user_id', authContext.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 500 });
    }

    const activeReport = reports?.[0];
    if (!activeReport?.file_path) {
      return NextResponse.json({ error: 'No active report found.' }, { status: 404 });
    }

    reportFilePath = activeReport.file_path;
    reportTitle = activeReport.title ?? 'GCC Reports';
  }

  let { data: fileData, error: downloadError } = await supabase.storage
    .from(reportsBucket)
    .download(reportFilePath);

  if (downloadError || !fileData) {
    const serviceClient = getSupabaseServiceRoleClient();
    if (serviceClient) {
      const serviceDownload = await serviceClient.storage.from(reportsBucket).download(reportFilePath);
      fileData = serviceDownload.data;
      downloadError = serviceDownload.error;
    }
  }

  if (downloadError || !fileData) {
    return NextResponse.json({ error: `Unable to read report file: ${downloadError?.message || 'not found'}.` }, { status: 404 });
  }

  const fileBuffer = await fileData.arrayBuffer();

  const response = new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="report.pdf"',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Report-Title': reportTitle,
    },
  });

  if (authContext.refreshedSession) {
    applySessionCookies(response, authContext.refreshedSession);
  }

  return response;
}
