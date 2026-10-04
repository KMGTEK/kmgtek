'use client';

import { format, subDays } from 'date-fns';
import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';

import type { AnalyticsReport } from '@kmg/shared';

import { DateRangePicker, type IsoDateRange } from '@/components/admin/date-range-picker';
import { EmptyState, ErrorState, PageHeader, StatCard, StatsSkeleton } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth/guards';
import { formatNumber } from '@/lib/utils';

const CATEGORY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const visitorsConfig: ChartConfig = { value: { label: 'Visitors', color: 'var(--chart-3)' } };
const pageViewsConfig: ChartConfig = { value: { label: 'Page views', color: 'var(--chart-1)' } };
const barConfig: ChartConfig = { count: { label: 'Count', color: 'var(--chart-1)' } };

function useAnalytics(range: IsoDateRange) {
  return useQuery({
    queryKey: qk.admin.analytics({ from: range.from, to: range.to }),
    queryFn: () => api.getData<AnalyticsReport>('/admin/analytics', { query: { from: range.from, to: range.to } }),
    enabled: Boolean(range.from && range.to),
  });
}

function SimpleTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <EmptyState variant="plain" title={emptyLabel} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => (
              <TableCell key={cellIndex}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AnalyticsContent() {
  const [range, setRange] = React.useState<IsoDateRange>({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const { data, isLoading, error, refetch } = useAnalytics(range);

  const devices = (data?.devices ?? []).map((entry, index) => ({ ...entry, fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }));
  const sources = (data?.applicantSources ?? []).slice(0, 6).map((entry, index) => ({
    ...entry,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Traffic, conversion and content performance over a date range."
        actions={<DateRangePicker value={range} onChange={setRange} />}
      />

      {isLoading ? (
        <StatsSkeleton count={8} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : !data ? (
        <EmptyState title="No data for this range" description="Try a different date range." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Visitors" value={data.totals.visitors} icon="Eye" />
            <StatCard label="Page Views" value={data.totals.pageViews} icon="FileText" />
            <StatCard label="Leads" value={data.totals.leads} icon="Handshake" hint={`${data.totals.leadConversionRate}% conversion`} />
            <StatCard label="Applications" value={data.totals.applications} icon="Users" />
            <StatCard label="Active Jobs" value={data.totals.activeJobs} icon="Briefcase" />
            <StatCard
              label="Interview Conversion"
              value={`${data.totals.interviewConversionRate}%`}
              icon="CalendarDays"
              hint="Interviews / applications"
            />
            <StatCard label="Avg Time to Hire" value={`${data.totals.avgTimeToHireDays}d`} icon="Clock" />
            <StatCard label="Lead Conversion" value={`${data.totals.leadConversionRate}%`} icon="TrendingUp" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Visitor Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {data.visitors.every((p) => p.value === 0) ? (
                  <EmptyState variant="plain" title="No visitor data" />
                ) : (
                  <ChartContainer config={visitorsConfig} className="h-64 w-full">
                    <AreaChart data={data.visitors} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="value" type="monotone" fill="var(--color-value)" fillOpacity={0.15} stroke="var(--color-value)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Page View Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {data.pageViews.every((p) => p.value === 0) ? (
                  <EmptyState variant="plain" title="No page view data" />
                ) : (
                  <ChartContainer config={pageViewsConfig} className="h-64 w-full">
                    <AreaChart data={data.pageViews} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="value" type="monotone" fill="var(--color-value)" fillOpacity={0.15} stroke="var(--color-value)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Applicant Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {sources.length === 0 ? (
                  <EmptyState variant="plain" title="No source data" />
                ) : (
                  <ChartContainer config={barConfig} className="h-64 w-full">
                    <BarChart data={sources} layout="vertical" margin={{ left: 16, right: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} width={110} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={4}>
                        {sources.map((entry) => (
                          <Cell key={entry.source} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <EmptyState variant="plain" title="No device data" />
                ) : (
                  <ChartContainer config={barConfig} className="h-64 w-full">
                    <BarChart data={devices} layout="vertical" margin={{ left: 16, right: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="device" type="category" tickLine={false} axisLine={false} width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={4}>
                        {devices.map((entry) => (
                          <Cell key={entry.device} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  headers={['Path', 'Views']}
                  emptyLabel="No page data"
                  rows={data.topPages.map((page) => [page.path, formatNumber(page.views)])}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Referrers</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable
                  headers={['Referrer', 'Count']}
                  emptyLabel="No referrer data"
                  rows={data.referrers.map((referrer) => [referrer.referrer, formatNumber(referrer.count)])}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RequireAuth permission="analytics:read">
      <AnalyticsContent />
    </RequireAuth>
  );
}
