'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, Database, FileText } from 'lucide-react';

import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [fullName, setFullName] = useState<string>('');

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

    if (isSessionLoading || !sessionUserId) {
      return;
    }

    const supabase = getSupabase();

    const loadProfile = async () => {
      const profileResponse: any = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', sessionUserId)
        .maybeSingle();
      const profileData = profileResponse?.data as { full_name?: string | null } | null;

      if (profileData?.full_name) {
        setFullName(profileData.full_name);
      } else {
        const metadataName = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName;
        setFullName(typeof metadataName === 'string' ? metadataName : '');
      }
    };

    loadProfile();
  }, [isSessionLoading, session?.user?.id, session?.user?.user_metadata?.fullName, session?.user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.replace('/auth');
    }
  }, [isSessionLoading, session, router]);

  const displayName = useMemo(() => {
    if (fullName.trim()) {
      return fullName.trim();
    }

    const metadataName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.fullName;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim();
    }

    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }

    return 'there';
  }, [fullName, session?.user?.email, session?.user?.user_metadata?.fullName, session?.user?.user_metadata?.full_name]);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  if (isSessionLoading || !session) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Report logo" width={34} height={34} className="h-8 w-8" />
            <p className="text-base font-semibold text-foreground">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-muted-foreground lg:block">{session.user.email}</p>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
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
