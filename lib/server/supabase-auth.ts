import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'br_access_token';
const REFRESH_TOKEN_COOKIE = 'br_refresh_token';
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createServerSupabaseClient(accessToken?: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  if (!accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getSupabaseServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }

  const { supabaseUrl } = getSupabaseEnv();
  return createClient(supabaseUrl, serviceRoleKey);
}

export function applySessionCookies(response: NextResponse, session: Session) {
  const secure = process.env.NODE_ENV === 'production';
  const accessTokenMaxAge = session.expires_at
    ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
    : 60 * 60;

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: session.access_token,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: accessTokenMaxAge,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: session.refresh_token,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function getAccessToken(request: NextRequest) {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value?.trim() || null;
}

function getRefreshToken(request: NextRequest) {
  return request.cookies.get(REFRESH_TOKEN_COOKIE)?.value?.trim() || null;
}

export interface AuthenticatedRequestContext {
  user: User;
  accessToken: string;
  refreshedSession?: Session;
}

export async function getAuthenticatedRequestContext(
  request: NextRequest
): Promise<AuthenticatedRequestContext | null> {
  const accessToken = getAccessToken(request);
  const refreshToken = getRefreshToken(request);
  const supabase = createServerSupabaseClient();

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return {
        user: data.user,
        accessToken,
      };
    }
  }

  if (!refreshToken) {
    return null;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshError || !refreshData.session?.access_token || !refreshData.session.user) {
    return null;
  }

  return {
    user: refreshData.session.user,
    accessToken: refreshData.session.access_token,
    refreshedSession: refreshData.session,
  };
}
