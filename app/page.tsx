'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from '@supabase/supabase-js';
import { Database, FileText } from 'lucide-react';

import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
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
      // Avoid unnecessary re-renders/refetches when tab focus triggers token refresh.
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

  return (
    <main className="min-h-screen bg-[#F6FBFE]">
      <header className="border-b border-[#6EC4EA]/40 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Report logo" width={38} height={38} className="h-9 w-9" />
            <p className="text-lg font-bold tracking-[0.04em] text-black">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <p className="hidden rounded-full border border-[#6EC4EA]/50 bg-[#6EC4EA]/20 px-3 py-1 text-sm text-[#017ABF] md:block">
                  {session.user.email}
                </p>
                <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {session && (
          <section className="mb-6 rounded-2xl border border-[#6EC4EA]/35 bg-white p-5">
            <p className="text-sm font-medium text-slate-600">
              Hi <span className="font-semibold text-slate-900">{displayName}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">Choose what you want to access.</p>
          </section>
        )}

        {!session && !isSessionLoading && (
          <Card className="border-[#6EC4EA]/40 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                This dashboard reads protected Supabase data. Please sign in to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth">Go to Sign In / Sign Up</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {session && (
          <section className="grid gap-5 md:grid-cols-2">
            <Card className="border-[#6EC4EA]/45 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Database className="h-5 w-5 text-[#017ABF]" />
                  View Database
                </CardTitle>
                <CardDescription>
                  Browse sortable company records, detailed popups, and structured metadata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="bg-[#017ABF] text-white hover:bg-[#0168a3]">
                  <Link href="/database">Open Database</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[#FFAE71]/45 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileText className="h-5 w-5 text-[#F17C1D]" />
                  View Report
                </CardTitle>
                <CardDescription>
                  Open your assigned PDF report inside the in-app secured custom viewer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="bg-[#F17C1D] text-white hover:bg-[#da6e13]">
                  <Link href="/report">Open Report</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
