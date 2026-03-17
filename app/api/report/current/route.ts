import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reportsBucket = process.env.SUPABASE_REPORTS_BUCKET?.trim() || 'reports';
  const sharedReportPath = process.env.GLOBAL_REPORT_FILE_PATH?.trim();
  const sharedReportTitle = process.env.GLOBAL_REPORT_TITLE?.trim() || 'Shared Report';

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server is missing Supabase environment variables.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
  }

  let reportFilePath = sharedReportPath || '';
  let reportTitle = sharedReportTitle;

  if (!reportFilePath) {
    const { data: reports, error: reportError } = await supabase
      .from('user_reports')
      .select('title, file_path')
      .eq('user_id', userData.user.id)
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

  if ((downloadError || !fileData) && supabaseServiceRoleKey) {
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const serviceDownload = await serviceClient.storage.from(reportsBucket).download(reportFilePath);
    fileData = serviceDownload.data;
    downloadError = serviceDownload.error;
  }

  if (downloadError || !fileData) {
    return NextResponse.json({ error: `Unable to read report file: ${downloadError?.message || 'not found'}.` }, { status: 404 });
  }

  const fileBuffer = await fileData.arrayBuffer();

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="report.pdf"',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Report-Title': reportTitle,
    },
  });
}
