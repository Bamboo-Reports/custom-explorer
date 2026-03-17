'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const router = useRouter();
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (signInError) {
        throw signInError;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        options: {
          data: {
            full_name: signUpFullName.trim(),
          },
        },
        email: signUpEmail,
        password: signUpPassword,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (signUpData.session) {
        router.push('/');
        router.refresh();
        return;
      }

      setMessage('Sign up successful. Check your email to confirm your account, then sign in.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Account Access</h1>
            <p className="mt-2 text-muted-foreground">Sign in or create an account to view dashboard data.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Use your email and password with Supabase Auth.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="space-y-4" onSubmit={handleSignIn}>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signInEmail}
                      onChange={(event) => setSignInEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={signInPassword}
                      onChange={(event) => setSignInPassword(event.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={handleSignUp}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-full-name">Full name</Label>
                    <Input
                      id="signup-full-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={signUpFullName}
                      onChange={(event) => setSignUpFullName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signUpEmail}
                      onChange={(event) => setSignUpEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={signUpPassword}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
