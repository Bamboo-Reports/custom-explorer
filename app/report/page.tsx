'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabase } from '@/lib/supabase';

const PDFJS_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string }) => {
    promise: Promise<any>;
  };
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

function loadPdfJs() {
  return new Promise<PdfJsLib>((resolve, reject) => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
      return;
    }

    const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (!window.pdfjsLib) {
          reject(new Error('Unable to initialize PDF runtime.'));
          return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('Unable to initialize PDF runtime.'));
        return;
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF renderer.'));
    document.head.appendChild(script);
  });
}

export default function ReportPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportMissing, setReportMissing] = useState(false);
  const [reportTitle, setReportTitle] = useState('Assigned Report');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reportUrlRef = useRef<string | null>(null);

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
    if (!session?.access_token) {
      return;
    }

    let isCancelled = false;

    const loadReport = async () => {
      setIsReportLoading(true);
      setError(null);
      setReportMissing(false);

      try {
        const response = await fetch('/api/report/current', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.status === 404) {
          if (!isCancelled) {
            setReportMissing(true);
            setPdfDoc(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Unable to load report.');
        }

        const title = response.headers.get('x-report-title');
        if (title && !isCancelled) {
          setReportTitle(title);
        }

        const reportBlob = await response.blob();
        const objectUrl = URL.createObjectURL(reportBlob);

        if (reportUrlRef.current) {
          URL.revokeObjectURL(reportUrlRef.current);
        }
        reportUrlRef.current = objectUrl;

        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({ url: objectUrl });
        const loadedPdf = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(loadedPdf);
          setPageCount(loadedPdf.numPages || 1);
          setPageNumber(1);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load report');
          setPdfDoc(null);
        }
      } finally {
        if (!isCancelled) {
          setIsReportLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      isCancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    return () => {
      if (reportUrlRef.current) {
        URL.revokeObjectURL(reportUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const blockShortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', blockShortcuts);
    return () => {
      window.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (isCancelled) {
          return;
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch {
        if (!isCancelled) {
          setError('Failed to render this page.');
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pageNumber, pdfDoc, zoom]);

  const viewerName = useMemo(() => {
    const metadataName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.fullName;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim();
    }

    return session?.user?.email || 'Authenticated user';
  }, [session?.user?.email, session?.user?.user_metadata?.fullName, session?.user?.user_metadata?.full_name]);

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
              <Link href="/database">View Database</Link>
            </Button>
            {session && <Button variant="outline" onClick={handleSignOut}>Sign out</Button>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {!session && !isSessionLoading && (
          <Card className="border-[#6EC4EA]/40 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                Please sign in to view your report.
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
          <Card className="border-[#6EC4EA]/40 bg-white shadow-none">
            <CardHeader className="border-b border-[#6EC4EA]/30">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-[#F17C1D]" />
                {reportTitle}
              </CardTitle>
              <CardDescription>Custom in-app viewer. Download and print shortcuts are disabled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6EC4EA]/35 bg-[#F6FBFE] px-4 py-3">
                <div className="text-sm text-slate-600">
                  Viewer access: <span className="font-medium text-slate-800">{viewerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
                    disabled={!pdfDoc}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="min-w-16 text-center text-sm text-slate-600">{Math.round(zoom * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                    disabled={!pdfDoc}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="mx-2 h-6 w-px bg-[#6EC4EA]/40" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                    disabled={!pdfDoc || pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-20 text-center text-sm text-slate-600">
                    {pdfDoc ? `${pageNumber} / ${pageCount}` : '0 / 0'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
                    disabled={!pdfDoc || pageNumber >= pageCount}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                className="relative overflow-auto rounded-xl border border-[#6EC4EA]/35 bg-slate-100 p-4"
                onContextMenu={(event) => event.preventDefault()}
              >
                {isReportLoading && (
                  <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-600">
                    Loading your report...
                  </div>
                )}

                {!isReportLoading && reportMissing && (
                  <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-600">
                    No report assigned yet. Contact your administrator.
                  </div>
                )}

                {!isReportLoading && error && (
                  <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-red-600">
                    {error}
                  </div>
                )}

                {!isReportLoading && !reportMissing && !error && (
                  <div className="relative mx-auto w-fit">
                    <canvas ref={canvasRef} className="mx-auto max-w-full rounded-md border border-slate-300 bg-white shadow-sm" />
                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500">
                      {viewerName}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
