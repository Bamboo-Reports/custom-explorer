'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const PDFJS_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string }) => {
    promise: Promise<any>;
  };
}

interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportMissing, setReportMissing] = useState(false);
  const [reportTitle, setReportTitle] = useState('GCC Reports');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(0.8);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reportUrlRef = useRef<string | null>(null);

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
    if (!sessionUser) {
      return;
    }

    let isCancelled = false;

    const loadReport = async () => {
      setIsReportLoading(true);
      setError(null);
      setReportMissing(false);
      setIsPdfReady(false);
      setPdfDoc(null);
      setPageNumber(1);
      setPageCount(1);

      try {
        const response = await fetch('/api/report/current', {
          cache: 'no-store',
        });

        if (response.status === 401) {
          if (!isCancelled) {
            setSessionUser(null);
            router.replace('/auth');
          }
          return;
        }

        if (response.status === 404) {
          if (!isCancelled) {
            setReportMissing(true);
            setPdfDoc(null);
            setIsPdfReady(false);
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
          setIsPdfReady(false);
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
  }, [sessionUser, router]);

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

        if (!isCancelled) {
          setIsPdfReady(true);
        }
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
    if (sessionUser?.fullName?.trim()) {
      return sessionUser.fullName.trim();
    }

    return sessionUser?.email || 'Authenticated user';
  }, [sessionUser?.email, sessionUser?.fullName]);
  const viewerEmail = sessionUser?.email || 'authenticated user';

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

      <div className="mx-auto w-full max-w-[1250px] px-6 py-6">
        <section className="mb-4 rounded-xl border border-border/80 bg-card px-5 py-4 sm:px-6 sm:py-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{reportTitle}</h1>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Viewer: <span className="font-medium text-foreground">{viewerName}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="relative overflow-auto rounded-xl border border-border/80 bg-muted/40 p-3 sm:p-4" onContextMenu={(event) => event.preventDefault()}>
            {isReportLoading && (
              <div className="mx-auto flex min-h-[420px] w-full max-w-[760px] flex-col gap-4 rounded-lg border border-border/70 bg-background/80 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-[460px] w-full rounded-md" />
                <div className="flex justify-end">
                  <Skeleton className="h-4 w-28" />
                </div>
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
              <>
                {!isPdfReady && (
                  <div className="mx-auto flex min-h-[420px] w-full max-w-[760px] items-center justify-center rounded-lg border border-border/70 bg-background/80">
                    <p className="text-sm text-muted-foreground">Preparing PDF...</p>
                  </div>
                )}

                <div
                  className={`relative mx-auto w-fit transition-all duration-300 ease-out ${isPdfReady ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'}`}
                >
                <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                  <div className="flex h-full w-full items-center justify-center">
                    <span
                      className="-rotate-24 select-none text-center break-all leading-tight text-base font-semibold tracking-[0.08em] text-gray-500 sm:text-lg lg:text-[22px] max-w-[80%]"
                      style={{ opacity: 0.06 }}
                    >
                      {viewerEmail}
                    </span>
                  </div>
                </div>
                <canvas ref={canvasRef} className="mx-auto max-w-full rounded-md border border-border bg-white shadow-[0_12px_30px_-24px_rgba(0,0,0,0.6)]" />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
