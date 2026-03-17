'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Globe2,
  Landmark,
  MapPin,
  Network,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface DataTableProps {
  data: CompanyData[];
  isLoading: boolean;
  emptyMessage?: string;
}

const ROWS_PER_PAGE = 13;
type SortDirection = 'asc' | 'desc';
type SortKey = 'parent_company_name' | 'industry' | 'revenue_range' | 'location' | 'website';
const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_GAZeDBqlSWS8CSE3PZ8WeA';

function withProtocol(url: string) {
  if (!url) {
    return '#';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
}

function getDomainFromWebsite(website: string | undefined) {
  if (!website) {
    return '';
  }

  const raw = website.trim();
  if (!raw) {
    return '';
  }

  const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;

  try {
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return normalized.replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/^www\./, '');
  }
}

function CompanyLogo({ domain, companyName, size = 28 }: { domain: string; companyName: string; size?: number }) {
  const fallbackChar = (companyName || '?').trim().charAt(0).toUpperCase();

  if (!domain) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md border border-border bg-muted font-semibold text-muted-foreground"
        style={{ width: size, height: size, fontSize: size < 32 ? 10 : 12 }}
      >
        {fallbackChar}
      </div>
    );
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-md border border-border/70 bg-white" style={{ width: size, height: size }}>
      <Image
        src={`https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`}
        alt={`${companyName || 'Company'} logo`}
        width={size}
        height={size}
        className="object-contain"
      />
    </div>
  );
}

function DetailField({
  label,
  value,
  icon: Icon,
  accentClassName = 'text-slate-600',
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  accentClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={`h-3.5 w-3.5 ${accentClassName}`} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value || 'N/A'}</p>
    </div>
  );
}

function hasVisibleValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'n/a' && normalized !== 'na';
}

export function DataTable({ data, isLoading, emptyMessage }: DataTableProps) {
  const [selectedRow, setSelectedRow] = useState<CompanyData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('parent_company_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = (a[sortKey] || '').toString();
      const bValue = (b[sortKey] || '').toString();

      const comparison = aValue.localeCompare(bValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortDirection, sortKey]);

  const handleSort = (column: SortKey) => {
    setCurrentPage(1);

    if (sortKey === column) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(column);
    setSortDirection('asc');
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedData.length / ROWS_PER_PAGE)),
    [sortedData.length]
  );

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  const displayedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [currentPage, sortedData]);

  const paginationWindow = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  const recordsLabel = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(currentPage * ROWS_PER_PAGE, sortedData.length);

    return `Showing ${start}-${end} of ${sortedData.length} ${sortedData.length === 1 ? 'record' : 'records'}`;
  }, [currentPage, sortedData.length]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading data...</span>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="flex items-center justify-center text-center text-muted-foreground">
          {emptyMessage || 'No data available'}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 rounded-2xl border border-border/70 bg-card pt-2 pb-0 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/70">
          <div className="relative max-h-[760px] overflow-auto">
            <Table className="table-fixed border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="sticky top-0 z-30 w-[280px] bg-background shadow-[inset_0_-2px_0_0_hsl(var(--border)),0_10px_14px_-14px_hsl(var(--foreground)/0.45)]">
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground"
                      onClick={() => handleSort('parent_company_name')}
                      aria-label="Sort by Company Name"
                    >
                      Company Name
                      {sortKey === 'parent_company_name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-30 w-[220px] bg-background shadow-[inset_0_-2px_0_0_hsl(var(--border)),0_10px_14px_-14px_hsl(var(--foreground)/0.45)]">
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground"
                      onClick={() => handleSort('industry')}
                      aria-label="Sort by Industry"
                    >
                      Industry
                      {sortKey === 'industry' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-30 w-[160px] bg-background shadow-[inset_0_-2px_0_0_hsl(var(--border)),0_10px_14px_-14px_hsl(var(--foreground)/0.45)]">
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground"
                      onClick={() => handleSort('revenue_range')}
                      aria-label="Sort by Revenue Range"
                    >
                      Revenue Range
                      {sortKey === 'revenue_range' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-30 w-[180px] bg-background shadow-[inset_0_-2px_0_0_hsl(var(--border)),0_10px_14px_-14px_hsl(var(--foreground)/0.45)]">
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground"
                      onClick={() => handleSort('location')}
                      aria-label="Sort by Location"
                    >
                      Location
                      {sortKey === 'location' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-30 w-[220px] bg-background shadow-[inset_0_-2px_0_0_hsl(var(--border)),0_10px_14px_-14px_hsl(var(--foreground)/0.45)]">
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground"
                      onClick={() => handleSort('website')}
                      aria-label="Sort by Website"
                    >
                      Website
                      {sortKey === 'website' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:first-child_td]:border-t-2 [&_tr:first-child_td]:border-border [&_tr_td]:border-b [&_tr_td]:border-border/80">
                {displayedRows.map((row, index) => {
                  const domain = getDomainFromWebsite(row.website);

                  return (
                    <TableRow
                      key={row.id || index}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="font-medium text-foreground">
                        <button
                          type="button"
                          className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedRow(row)}
                          aria-label={`View details for ${row.parent_company_name || 'company'}`}
                        >
                          <CompanyLogo domain={domain} companyName={row.parent_company_name} />
                          <span className="block flex-1 truncate">{row.parent_company_name || 'N/A'}</span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-primary/80 transition-all duration-200 motion-safe:animate-pulse group-hover:translate-x-1 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                      <Badge
                        variant="outline"
                        className="max-w-full justify-start border-[#6EC4EA] bg-[#6EC4EA]/25 text-[#017ABF] whitespace-normal break-words text-left leading-tight font-normal"
                      >
                        {row.industry || 'N/A'}
                      </Badge>
                      </TableCell>
                      <TableCell>
                      <Badge
                        variant="outline"
                        className="max-w-full justify-start border-[#FFAE71] bg-[#FFAE71]/30 text-[#F17C1D] whitespace-normal break-words text-left leading-tight font-normal"
                      >
                        {row.revenue_range || 'N/A'}
                      </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                      <Badge
                        variant="outline"
                        className="max-w-full justify-start border-[#6EC4EA]/80 bg-[#6EC4EA]/15 text-[#017ABF] whitespace-normal break-words text-left leading-tight font-normal"
                      >
                        {row.location || 'N/A'}
                      </Badge>
                      </TableCell>
                      <TableCell>
                        {row.website ? (
                          <a
                            href={withProtocol(row.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80 hover:underline"
                          >
                            <span className="max-w-[180px] truncate">{row.website}</span>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{recordsLabel}</p>
          <Pagination className="mx-0 w-auto justify-start md:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.max(1, page - 1));
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {paginationWindow[0] > 1 && (
                <>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(1);
                      }}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {paginationWindow[0] > 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                </>
              )}

              {paginationWindow.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(page);
                    }}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {paginationWindow[paginationWindow.length - 1] < totalPages && (
                <>
                  {paginationWindow[paginationWindow.length - 1] < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(totalPages);
                      }}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          {selectedRow && (
            <>
              {(() => {
                const selectedDomain = getDomainFromWebsite(selectedRow.website);

                return (
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                  <CompanyLogo domain={selectedDomain} companyName={selectedRow.parent_company_name} size={40} />
                  <span>{selectedRow.parent_company_name || 'Company details'}</span>
                </DialogTitle>
              </DialogHeader>
                );
              })()}

              <div className="grid gap-5 py-2">
                <section className="rounded-2xl border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-4 w-4 text-[#017ABF]" aria-hidden="true" />
                    Core Profile
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="Company Name" value={selectedRow.parent_company_name} icon={Building2} accentClassName="text-[#017ABF]" />
                    <DetailField label="Industry" value={selectedRow.industry} icon={BriefcaseBusiness} accentClassName="text-[#017ABF]" />
                    <DetailField label="Revenue Range" value={selectedRow.revenue_range} icon={Landmark} accentClassName="text-[#F17C1D]" />
                    <DetailField label="Location" value={selectedRow.location} icon={MapPin} accentClassName="text-[#017ABF]" />
                    <DetailField label="Website" value={selectedRow.website} icon={Globe2} accentClassName="text-[#017ABF]" />
                  </div>
                </section>

                <section className="rounded-2xl border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Network className="h-4 w-4 text-[#017ABF]" aria-hidden="true" />
                    India Operations
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="India Primary Location" value={selectedRow.india_primary_location} icon={MapPin} accentClassName="text-[#017ABF]" />
                    {hasVisibleValue(selectedRow.india_secondary_location) && (
                      <DetailField label="India Secondary Location" value={selectedRow.india_secondary_location} icon={MapPin} accentClassName="text-[#017ABF]" />
                    )}
                    <DetailField label="India Year" value={selectedRow.india_year} icon={CalendarDays} accentClassName="text-[#F17C1D]" />
                    <DetailField label="India Headcount Range" value={selectedRow.india_headcount_range} icon={Users} accentClassName="text-[#017ABF]" />
                    <DetailField label="India GCC Type" value={selectedRow.india_gcc_type} icon={Building2} accentClassName="text-[#017ABF]" />
                  </div>
                </section>

                <section className="rounded-2xl border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <BriefcaseBusiness className="h-4 w-4 text-[#F17C1D]" aria-hidden="true" />
                    Capabilities
                  </h3>
                  <DetailField label="Services Offered" value={selectedRow.services_offered} icon={BriefcaseBusiness} accentClassName="text-[#F17C1D]" />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
