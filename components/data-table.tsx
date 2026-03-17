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

import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  embedded?: boolean;
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
        className="flex shrink-0 items-center justify-center rounded-sm border border-border bg-muted text-xs font-semibold text-muted-foreground"
        style={{ width: size, height: size }}
      >
        {fallbackChar}
      </div>
    );
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-sm border border-border bg-white" style={{ width: size, height: size }}>
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
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{value || 'N/A'}</p>
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

export function DataTable({ data, isLoading, emptyMessage, embedded = false }: DataTableProps) {
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedData.length / ROWS_PER_PAGE)), [sortedData.length]);

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

  const shellClass = embedded ? 'rounded-md border border-border bg-muted/50 p-4' : '';

  if (isLoading) {
    return (
      <div className={shellClass}>
        <Card className={embedded ? 'rounded-md p-6' : 'rounded-lg p-8'}>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm">Loading data...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={shellClass}>
        <Card className={embedded ? 'rounded-md p-6' : 'rounded-lg p-8'}>
          <div className="flex items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage || 'No data available'}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className={shellClass}>
        <Card className={embedded ? 'gap-0 overflow-hidden rounded-md p-0' : 'gap-0 overflow-hidden rounded-lg p-0'}>
          <div className="overflow-auto">
            <Table className="min-w-[980px] border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="sticky top-0 z-20 w-[280px] bg-muted/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      onClick={() => handleSort('parent_company_name')}
                      aria-label="Sort by company name"
                    >
                      Company
                      {sortKey === 'parent_company_name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 w-[220px] bg-muted/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      onClick={() => handleSort('industry')}
                      aria-label="Sort by industry"
                    >
                      Industry
                      {sortKey === 'industry' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 w-[160px] bg-muted/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      onClick={() => handleSort('revenue_range')}
                      aria-label="Sort by revenue range"
                    >
                      Revenue
                      {sortKey === 'revenue_range' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 w-[180px] bg-muted/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      onClick={() => handleSort('location')}
                      aria-label="Sort by location"
                    >
                      Location
                      {sortKey === 'location' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 w-[220px] bg-muted/60">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      onClick={() => handleSort('website')}
                      aria-label="Sort by website"
                    >
                      Website
                      {sortKey === 'website' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr_td]:border-b [&_tr_td]:border-border/80">
                {displayedRows.map((row, index) => {
                  const domain = getDomainFromWebsite(row.website);

                  return (
                    <TableRow key={row.id || index} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-foreground">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedRow(row)}
                          aria-label={`View details for ${row.parent_company_name || 'company'}`}
                        >
                          <CompanyLogo domain={domain} companyName={row.parent_company_name} />
                          <span className="block flex-1 truncate">{row.parent_company_name || 'N/A'}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{row.industry || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-foreground">{row.revenue_range || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-foreground">{row.location || 'N/A'}</TableCell>
                      <TableCell>
                        {row.website ? (
                          <a
                            href={withProtocol(row.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                          >
                            <span className="max-w-[180px] truncate">{row.website}</span>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
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
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          {selectedRow && (
            <>
              {(() => {
                const selectedDomain = getDomainFromWebsite(selectedRow.website);

                return (
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                      <CompanyLogo domain={selectedDomain} companyName={selectedRow.parent_company_name} size={36} />
                      <span>{selectedRow.parent_company_name || 'Company details'}</span>
                    </DialogTitle>
                  </DialogHeader>
                );
              })()}

              <div className="grid gap-4 py-2">
                <section className="rounded-md border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    Core Profile
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="Company Name" value={selectedRow.parent_company_name} icon={Building2} />
                    <DetailField label="Industry" value={selectedRow.industry} icon={BriefcaseBusiness} />
                    <DetailField label="Revenue Range" value={selectedRow.revenue_range} icon={Landmark} />
                    <DetailField label="Location" value={selectedRow.location} icon={MapPin} />
                    <DetailField label="Website" value={selectedRow.website} icon={Globe2} />
                  </div>
                </section>

                <section className="rounded-md border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Network className="h-4 w-4 text-primary" aria-hidden="true" />
                    India Operations
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="India Primary Location" value={selectedRow.india_primary_location} icon={MapPin} />
                    {hasVisibleValue(selectedRow.india_secondary_location) && (
                      <DetailField label="India Secondary Location" value={selectedRow.india_secondary_location} icon={MapPin} />
                    )}
                    <DetailField label="India Year" value={selectedRow.india_year} icon={CalendarDays} />
                    <DetailField label="India Headcount Range" value={selectedRow.india_headcount_range} icon={Users} />
                    <DetailField label="India GCC Type" value={selectedRow.india_gcc_type} icon={Building2} />
                  </div>
                </section>

                <section className="rounded-md border border-border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" />
                    Capabilities
                  </h3>
                  <DetailField label="Services Offered" value={selectedRow.services_offered} icon={BriefcaseBusiness} />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
