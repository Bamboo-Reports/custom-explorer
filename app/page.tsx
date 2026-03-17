'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { Database, FileText } from 'lucide-react';

import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <section className="mb-6 rounded-lg border border-border bg-card p-5">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back, {displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a workspace to continue.</p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4 text-primary" />
                Company Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/database">Open database</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4 text-primary" />
                Assigned Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/report">Open report</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
