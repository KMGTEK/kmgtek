'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import type { DashboardCharts, DashboardSummary } from '@kmg/shared';
import { APPLICATION_PIPELINE, APPLICATION_STATUS_LABELS } from '@kmg/shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState, ErrorState, PageHeader, StatCard, StatsSkeleton } from '@/components/shared';
import { RequireAuth } from '@/lib/auth/guards';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/utils';

function useDashboardSummary() {
  return useQuery({
    queryKey: qk.admin.dashboard.summary,
    queryFn: () => api.getData<DashboardSummary>('/admin/dashboard/summary'),
  });
}

function useDashboardCharts(months = 12) {
  return useQuery({
    queryKey: qk.admin.dashboard.charts(months),
    queryFn: () => api.getData<DashboardCharts>('/admin/dashboard/charts', { query: { months } }),
  });
}

const applicationsConfig: ChartConfig = {
  value: { label: 'Applications', color: 'var(--chart-1)' },
};

const visitorsConfig: ChartConfig = {
  value: { label: 'Visitors', color: 'var(--chart-3)' },
};

const funnelConfig: ChartConfig = {
  count: { label: 'Candidates', color: 'var(--chart-1)' },
};

const SOURCE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState variant="plain" title="No data yet" description="Numbers will appear here once activity picks up." />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const summary = useDashboardSummary();
  const charts = useDashboardCharts(12);

  const monthlyApplications = charts.data?.monthlyApplications ?? [];
  const websiteVisitors = charts.data?.websiteVisitors ?? [];
  const hiringFunnelRaw = charts.data?.hiringFunnel ?? [];
  const leadSources = charts.data?.leadSources ?? [];

  const hiringFunnel = APPLICATION_PIPELINE.map((stage) => ({
    stage,
    label: APPLICATION_STATUS_LABELS[stage],
    count: hiringFunnelRaw.find((entry) => entry.stage === stage)?.count ?? 0,
  }));

  const topSources = leadSources.slice(0, 5).map((entry, index) => ({ ...entry, fill: SOURCE_COLORS[index] }));

  const allZeroSummary =
    summary.data &&
    Object.values(summary.data).every((value) => (typeof value === 'number' ? value === 0 : true));

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="A snapshot of recruitment and sales activity." />

      {summary.isLoading ? (
        <StatsSkeleton count={8} />
      ) : summary.error ? (
        <ErrorState error={summary.error} onAction={() => summary.refetch()} />
      ) : allZeroSummary ? (
        <EmptyState
          title="No activity yet"
          description="Once jobs, applications and leads start coming in, your key metrics will show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total Leads" value={summary.data?.totalLeads ?? 0} icon="Handshake" hint={`${summary.data?.newLeads ?? 0} new`} href="/admin/leads" />
          <StatCard label="Total Jobs" value={summary.data?.totalJobs ?? 0} icon="Briefcase" href="/admin/jobs" />
          <StatCard label="Active Jobs" value={summary.data?.activeJobs ?? 0} icon="Zap" tone="ember" href="/admin/jobs?status=PUBLISHED" />
          <StatCard
            label="Total Applicants"
            value={summary.data?.totalApplicants ?? 0}
            icon="Users"
            hint={`${summary.data?.applicationsThisMonth ?? 0} this month`}
            href="/admin/applications"
          />
          <StatCard label="Interviews" value={summary.data?.interviewsScheduled ?? 0} icon="CalendarDays" href="/admin/interviews" />
          <StatCard label="Messages" value={summary.data?.unreadMessages ?? 0} icon="MessageSquare" tone="ember" href="/admin/leads" />
          <StatCard label="Visitors" value={summary.data?.visitors ?? 0} icon="Eye" hint="Last 30 days" />
          <StatCard label="Conversion Rate" value={`${summary.data?.conversionRate ?? 0}%`} icon="TrendingUp" hint="Leads / visitors" />
        </div>
      )}

      {charts.error ? (
        <ErrorState error={charts.error} onAction={() => charts.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Monthly Applications" empty={!charts.isLoading && monthlyApplications.every((p) => p.value === 0)}>
            {charts.isLoading ? (
              <div className="bg-muted/30 h-64 animate-pulse rounded-lg" />
            ) : (
              <ChartContainer config={applicationsConfig} className="h-64 w-full">
                <BarChart data={monthlyApplications} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => formatDate(`${value}-01`, 'medium')}
                  />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(value) => formatDate(`${value}-01`, 'medium')} />}
                  />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </ChartCard>

          <ChartCard title="Website Visitors" empty={!charts.isLoading && websiteVisitors.every((p) => p.value === 0)}>
            {charts.isLoading ? (
              <div className="bg-muted/30 h-64 animate-pulse rounded-lg" />
            ) : (
              <ChartContainer config={visitorsConfig} className="h-64 w-full">
                <AreaChart data={websiteVisitors} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="value"
                    type="monotone"
                    fill="var(--color-value)"
                    fillOpacity={0.15}
                    stroke="var(--color-value)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </ChartCard>

          <ChartCard title="Hiring Funnel" empty={!charts.isLoading && hiringFunnel.every((p) => p.count === 0)}>
            {charts.isLoading ? (
              <div className="bg-muted/30 h-64 animate-pulse rounded-lg" />
            ) : (
              <ChartContainer config={funnelConfig} className="h-64 w-full">
                <BarChart data={hiringFunnel} layout="vertical" margin={{ left: 16, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={110} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </ChartCard>

          <ChartCard title="Lead Sources" empty={!charts.isLoading && topSources.length === 0}>
            {charts.isLoading ? (
              <div className="bg-muted/30 h-64 animate-pulse rounded-lg" />
            ) : (
              <ChartContainer config={funnelConfig} className="h-64 w-full">
                <BarChart data={topSources} layout="vertical" margin={{ left: 16, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} width={110} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {topSources.map((entry) => (
                      <Cell key={entry.source} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth permission="dashboard:read">
      <DashboardContent />
    </RequireAuth>
  );
}
