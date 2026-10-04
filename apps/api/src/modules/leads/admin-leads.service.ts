import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ContactLead, LeadStatus, LeadUpdateInput, Paginated, Permission } from '@kmg/shared';
import { ROLES } from '@kmg/shared';
import { buildMeta, parsePagination } from '../../common/utils/pagination.util';
import { toCsv } from '../../common/utils/csv.util';
import type { RequestUser } from '../../common/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';
import { LEAD_DETAIL_INCLUDE, LEAD_INCLUDE, toLeadDto, type LeadRow } from './leads.mappers';

export interface AdminLeadsQuery {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  assignedToId?: string;
  serviceId?: string;
  from?: string;
  to?: string;
}

const hasPermission = (user: RequestUser, permission: Permission): boolean =>
  user.roles.includes(ROLES.SUPER_ADMIN) || user.permissions.includes(permission);

function buildWhere(query: AdminLeadsQuery) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (query.from) createdAt.gte = new Date(query.from);
  if (query.to) createdAt.lte = new Date(query.to);
  return {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };
}

@Injectable()
export class AdminLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: AppEventsService,
  ) {}

  async list(query: AdminLeadsQuery): Promise<Paginated<ContactLead>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where = buildWhere(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contactLead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: LEAD_INCLUDE }),
      this.prisma.contactLead.count({ where }),
    ]);
    return { data: rows.map((r) => toLeadDto(r as LeadRow)), meta: buildMeta(total, page, pageSize) };
  }

  async get(id: string): Promise<ContactLead> {
    const row = await this.prisma.contactLead.findFirst({ where: { id, deletedAt: null }, include: LEAD_DETAIL_INCLUDE });
    if (!row) throw new NotFoundException('Lead not found');
    if (!row.readAt) {
      await this.prisma.contactLead.update({ where: { id }, data: { readAt: new Date() } });
    }
    return toLeadDto({ ...row, readAt: row.readAt ?? new Date() } as LeadRow);
  }

  async update(id: string, input: LeadUpdateInput, user: RequestUser): Promise<ContactLead> {
    const existing = await this.prisma.contactLead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lead not found');

    const data: { status?: LeadUpdateInput['status']; assignedToId?: string | null } = {};
    let assigneeChanged = false;

    if (input.status !== undefined) {
      if (!hasPermission(user, 'leads:write')) {
        throw new ForbiddenException('You do not have permission to change a lead status (requires leads:write)');
      }
      data.status = input.status;
    }

    if (input.assignedToId !== undefined) {
      if (!hasPermission(user, 'leads:assign')) {
        throw new ForbiddenException('You do not have permission to assign leads (requires leads:assign)');
      }
      if (input.assignedToId !== existing.assignedToId) assigneeChanged = true;
      data.assignedToId = input.assignedToId;
    }

    const row = await this.prisma.contactLead.update({ where: { id }, data, include: LEAD_DETAIL_INCLUDE });

    if (assigneeChanged && input.assignedToId) {
      this.events.emit(EVENTS.LEAD_ASSIGNED, { leadId: id, assigneeId: input.assignedToId });
    }

    return toLeadDto(row as LeadRow);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.contactLead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.prisma.softDelete('contactLead', id);
  }

  async addNote(id: string, authorId: string, content: string): Promise<ContactLead> {
    const existing = await this.prisma.contactLead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.prisma.leadNote.create({ data: { leadId: id, authorId, content } });
    const row = await this.prisma.contactLead.findUnique({ where: { id }, include: LEAD_DETAIL_INCLUDE });
    return toLeadDto(row as LeadRow);
  }

  async exportCsv(query: AdminLeadsQuery): Promise<string> {
    const where = buildWhere(query);
    const rows = await this.prisma.contactLead.findMany({ where, orderBy: { createdAt: 'desc' }, include: LEAD_INCLUDE });
    return toCsv(rows, [
      ['Name', 'name'],
      ['Email', 'email'],
      ['Company', (r) => r.company ?? ''],
      ['Phone', (r) => r.phone ?? ''],
      ['Country', (r) => r.country ?? ''],
      ['Service interest', (r) => r.serviceInterest ?? ''],
      ['Message', 'message'],
      ['Status', 'status'],
      ['Source', (r) => r.source ?? ''],
      ['Assigned to', (r) => r.assignedTo?.name ?? ''],
      ['Created at', 'createdAt'],
    ]);
  }
}
