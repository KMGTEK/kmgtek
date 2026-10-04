import type { ContactLead } from '@kmg/shared';

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  country: string | null;
  serviceInterest: string | null;
  message: string;
  status: ContactLead['status'];
  source: string | null;
  createdAt: Date;
  readAt?: Date | null;
  service: { id: string; title: string; slug: string } | null;
  assignedTo: { id: string; name: string } | null;
  notes?: { id: string; content: string; createdAt: Date; author: { id: string; name: string } }[];
};

export const toLeadDto = (row: LeadRow): ContactLead & { readAt?: string | null } => ({
  id: row.id,
  name: row.name,
  email: row.email,
  company: row.company,
  phone: row.phone,
  country: row.country,
  service: row.service,
  serviceInterest: row.serviceInterest,
  message: row.message,
  status: row.status,
  source: row.source,
  assignedTo: row.assignedTo,
  notes: row.notes?.map((n) => ({
    id: n.id,
    content: n.content,
    author: n.author,
    createdAt: n.createdAt.toISOString(),
  })),
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt?.toISOString() ?? null,
});

export const LEAD_INCLUDE = {
  service: { select: { id: true, title: true, slug: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

export const LEAD_DETAIL_INCLUDE = {
  ...LEAD_INCLUDE,
  notes: { orderBy: { createdAt: 'desc' as const }, include: { author: { select: { id: true, name: true } } } },
} as const;
