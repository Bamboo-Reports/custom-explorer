'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportMissing, setReportMissing] = useState(false);
  const [reportTitle, setReportTitle] = useState('Assigned Report');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(0.8);
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
    if (!isSessionLoading && !session) {
      router.replace('/auth');
    }
  }, [isSessionLoading, session, router]);

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

  if (isSessionLoading || !session) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Bamboo Reports logo" width={34} height={34} className="h-8 w-8" />
            <p className="text-base font-semibold text-foreground">Bamboo Reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/database">Database</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4 text-primary" />
              {reportTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                Viewer: <span className="font-medium text-foreground">{viewerName}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
                  disabled={!pdfDoc}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-14 text-center text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                  disabled={!pdfDoc}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="mx-1 h-6 w-px bg-border" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                  disabled={!pdfDoc || pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center text-sm text-muted-foreground">
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

            <div className="relative overflow-auto rounded-md border border-border bg-muted/50 p-4" onContextMenu={(event) => event.preventDefault()}>
              {isReportLoading && (
                <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
                  Loading your report...
                </div>
              )}

              {!isReportLoading && reportMissing && (
                <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-muted-foreground">
                  No report assigned yet. Contact your administrator.
                </div>
              )}

              {!isReportLoading && error && (
                <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-red-700">
                  {error}
                </div>
              )}

              {!isReportLoading && !reportMissing && !error && (
                <div className="relative mx-auto w-fit">
                  <canvas ref={canvasRef} className="mx-auto max-w-full border border-border bg-white" />
                  <div className="pointer-events-none absolute bottom-2 right-2 bg-white/85 px-2 py-1 text-[10px] text-muted-foreground">
                    {viewerName}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
