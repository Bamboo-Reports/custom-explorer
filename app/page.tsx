'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Database, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
}

export default function Home() {
  const router = useRouter();
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

  const displayName = useMemo(() => {
    if (sessionUser?.fullName?.trim()) {
      return sessionUser.fullName.trim();
    }

    if (sessionUser?.email) {
      return sessionUser.email.split('@')[0];
    }

    return 'there';
  }, [sessionUser?.email, sessionUser?.fullName]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/auth');
    router.refresh();
  };

  if (isSessionLoading || !sessionUser) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1250px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Report logo" width={34} height={34} className="h-8 w-8" />
            <p className="text-base font-semibold text-foreground">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-muted-foreground lg:block">{sessionUser.email}</p>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1250px] px-6 py-8">
        <section className="relative mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(241,124,29,0.12),transparent_45%)]" />
          <div className="relative text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Welcome back, {displayName}</h1>
            <p className="mt-2 text-base text-muted-foreground">Choose a workspace to continue.</p>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[620px] flex-col gap-3">
          <Link
            href="/database"
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_35px_-28px_rgba(241,124,29,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.07] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <Database className="h-9 w-9 text-primary" />
              </div>
              <h2 className="text-3xl font-semibold leading-none tracking-tight text-foreground">GCC Database</h2>
              <p className="max-w-sm text-sm text-muted-foreground">Open company records and account information.</p>
              <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-200 group-hover:bg-primary/90">
                Open database
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <Link
            href="/report"
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_35px_-28px_rgba(241,124,29,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.07] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <FileText className="h-9 w-9 text-primary" />
              </div>
              <h2 className="text-3xl font-semibold leading-none tracking-tight text-foreground">GCC Reports</h2>
              <p className="max-w-sm text-sm text-muted-foreground">View assigned reports and generated output.</p>
              <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-200 group-hover:bg-primary/90">
                Open report
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
