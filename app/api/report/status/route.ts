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

  // Shared mode: one report available to every authenticated user.
  if (sharedReportPath) {
    return NextResponse.json({
      hasReport: true,
      title: sharedReportTitle,
    });
  }

  const { data: reports, error: reportError } = await supabase
    .from('user_reports')
    .select('title')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  const activeReport = reports?.[0];
  return NextResponse.json({
    hasReport: Boolean(activeReport),
    title: activeReport?.title ?? null,
  });
}
