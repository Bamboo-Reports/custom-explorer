import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookies,
  createServerSupabaseClient,
  getAuthenticatedRequestContext,
} from '@/lib/server/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    const tableName = process.env.SUPABASE_TABLE?.trim() || process.env.NEXT_PUBLIC_SUPABASE_TABLE?.trim() || 'data';
    const schemaName = process.env.SUPABASE_SCHEMA?.trim() || process.env.NEXT_PUBLIC_SUPABASE_SCHEMA?.trim() || 'public';

    const userClient = createServerSupabaseClient(authContext.accessToken);
    const queryClient: any = schemaName === 'public' ? userClient : (userClient as any).schema(schemaName);
    const { data, error } = await queryClient.from(tableName).select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({
      rows: data || [],
      schemaName,
      tableName,
    });

    if (authContext.refreshedSession) {
      applySessionCookies(response, authContext.refreshedSession);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load data.' },
      { status: 500 }
    );
  }
}
