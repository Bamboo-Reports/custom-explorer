'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';

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

interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
}

interface CompaniesPayload {
  rows?: CompanyData[];
  schemaName?: string;
  tableName?: string;
  error?: string;
}

export default function DatabasePage() {
  const router = useRouter();
  const [data, setData] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | undefined>(undefined);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });

        if (!response.ok) {
          setSessionUser(null);
          return;
        }

        const payload = (await response.json()) as { user?: SessionUser };
        setSessionUser(payload.user || null);
      } catch {
        setSessionUser(null);
      } finally {
        setIsSessionLoading(false);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!isSessionLoading && !sessionUser) {
      router.replace('/auth');
    }
  }, [isSessionLoading, sessionUser, router]);

  useEffect(() => {
    if (isSessionLoading || !sessionUser) {
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setEmptyMessage(undefined);

        const response = await fetch('/api/database/companies', {
          cache: 'no-store',
        });

        if (response.status === 401) {
          setSessionUser(null);
          router.replace('/auth');
          return;
        }

        const payload = (await response.json()) as CompaniesPayload;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load data');
        }

        const rows = payload.rows || [];
        setData(rows);

        if (rows.length === 0) {
          const schemaName = payload.schemaName || 'public';
          const tableName = payload.tableName || 'data';
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
  }, [isSessionLoading, sessionUser, router]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/auth');
    router.refresh();
  };

  const navigateWithTransition = (href: string) => {
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => {
        router.push(href);
      });
      return;
    }

    router.push(href);
  };

  if (isSessionLoading || !sessionUser) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1250px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Reports logo" width={34} height={34} className="h-8 w-8" />
            <p className="text-base font-semibold text-foreground">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" onClick={() => navigateWithTransition('/report')}>
              Report
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1250px] px-6 py-6">
        <section className="mb-4 rounded-xl border border-border/80 bg-card px-5 py-4 sm:px-6 sm:py-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">GCC Database</h1>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div className="flex h-full w-full items-center justify-center">
              <span
                className="-rotate-24 select-none text-center break-all leading-tight text-[34px] font-semibold tracking-[0.08em] text-gray-500 sm:text-[46px] lg:text-[58px] max-w-[80%]"
                style={{ opacity: 0.06 }}
              >
                {sessionUser.email}
              </span>
            </div>
          </div>

          <div className="relative z-20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Viewer: <span className="font-medium text-foreground">{sessionUser.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Total Accounts: <span className="font-medium text-foreground">{isLoading ? 'Loading...' : data.length}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Error loading data</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <p className="mt-3 text-sm text-red-700">
                  Check <code className="rounded-sm bg-red-100 px-1.5 py-0.5">.env.local</code> for{' '}
                  <code className="rounded-sm bg-red-100 px-1.5 py-0.5">SUPABASE_URL</code>,{' '}
                  <code className="rounded-sm bg-red-100 px-1.5 py-0.5">SUPABASE_ANON_KEY</code>,{' '}
                  <code className="rounded-sm bg-red-100 px-1.5 py-0.5">SUPABASE_SCHEMA</code>, and{' '}
                  <code className="rounded-sm bg-red-100 px-1.5 py-0.5">SUPABASE_TABLE</code>.
                </p>
              </div>
            )}

            <DataTable data={data} isLoading={isLoading} emptyMessage={emptyMessage} embedded viewerEmail={sessionUser.email} />
          </div>
        </section>
      </div>
    </main>
  );
}
