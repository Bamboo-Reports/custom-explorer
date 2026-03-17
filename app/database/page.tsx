'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from '@supabase/supabase-js';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabase } from '@/lib/supabase';

interface CompanyData {
  id?: string;
  parent_company_name: string;
  industry: string;
  revenue_range: string;
  location: string;
  website: string;
  india_primary_location: string;
  india_secondary_location: string;
  india_year: string;
  india_headcount_range: string;
  india_gcc_type: string;
  services_offered: string;
}

export default function DatabasePage() {
  const [data, setData] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      setIsSessionLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, activeSession) => {
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      setSession(activeSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sessionUserId = session?.user?.id;

    if (isSessionLoading) {
      return;
    }

    if (!sessionUserId) {
      setIsLoading(false);
      setData([]);
      setError(null);
      setEmptyMessage(undefined);
      return;
    }

    const fetchData = async () => {
      const tableName = process.env.NEXT_PUBLIC_SUPABASE_TABLE?.trim() || 'data';
      const schemaName = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA?.trim() || 'public';

      try {
        setIsLoading(true);
        setError(null);
        setEmptyMessage(undefined);

        const supabase = getSupabase();
        const queryClient: any = schemaName === 'public' ? supabase : (supabase as any).schema(schemaName);
        const { data: companies, error: queryError } = await queryClient.from(tableName).select('*');

        if (queryError) {
          throw queryError;
        }

        const rows = companies || [];
        setData(rows);

        if (rows.length === 0) {
          setEmptyMessage(
            `No rows returned from ${schemaName}.${tableName}. If this table has rows, check your Supabase RLS SELECT policy for the authenticated role.`
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isSessionLoading, session?.user?.id]);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-[#F6FBFE]">
      <header className="border-b border-[#6EC4EA]/40 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Reports logo" width={38} height={38} className="h-9 w-9" />
            <p className="text-lg font-bold tracking-[0.04em] text-black">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/report">View Report</Link>
            </Button>
            {session && (
              <>
                <p className="hidden rounded-full border border-[#6EC4EA]/50 bg-[#6EC4EA]/20 px-3 py-1 text-sm text-[#017ABF] md:block">
                  {session.user.email}
                </p>
                <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {!session && !isSessionLoading && (
          <Card className="border-[#6EC4EA]/40 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                Please sign in to access the database viewer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth">Go to Sign In / Sign Up</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Error loading data:</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <p className="mt-3 text-sm text-red-600">
              Check <code className="bg-red-100 px-2 py-1">.env.local</code> for
              {' '}
              <code className="bg-red-100 px-2 py-1">NEXT_PUBLIC_SUPABASE_URL</code>,
              {' '}
              <code className="bg-red-100 px-2 py-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,
              {' '}
              <code className="bg-red-100 px-2 py-1">NEXT_PUBLIC_SUPABASE_SCHEMA</code>,
              {' '}
              and <code className="bg-red-100 px-2 py-1">NEXT_PUBLIC_SUPABASE_TABLE</code>.
            </p>
          </div>
        )}

        {session && <DataTable data={data} isLoading={isLoading} emptyMessage={emptyMessage} />}
      </div>
    </main>
  );
}
