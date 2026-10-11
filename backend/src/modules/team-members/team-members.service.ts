import { Injectable, NotFoundException } from '@nestjs/common';
import { teamMemberUpsertSchema, type TeamMember as TeamMemberDto } from '@kmg/shared';
import type { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// `TeamMemberUpsertInput` from `@kmg/shared` is `z.input` (pre-parse); `ZodValidationPipe` has
// already parsed the body by the time it reaches this service — use the `z.infer`/`z.output`
// shape instead.
export type TeamMemberUpsertData = z.infer<typeof teamMemberUpsertSchema>;

type TeamMemberRow = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  isLeadership: boolean;
  published: boolean;
  order: number;
};

const toDto = (row: TeamMemberRow): TeamMemberDto => ({
  id: row.id,
  name: row.name,
  title: row.title,
  bio: row.bio,
  photoUrl: row.photoUrl,
  linkedinUrl: row.linkedinUrl,
  twitterUrl: row.twitterUrl,
  isLeadership: row.isLeadership,
  published: row.published,
  order: row.order,
});

@Injectable()
export class TeamMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(leadership?: boolean): Promise<TeamMemberDto[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { published: true, ...(leadership !== undefined ? { isLeadership: leadership } : {}) },
      orderBy: { order: 'asc' },
    });
    return rows.map(toDto);
  }

  async listAdmin(): Promise<TeamMemberDto[]> {
    const rows = await this.prisma.teamMember.findMany({ orderBy: { order: 'asc' } });
    return rows.map(toDto);
  }

  async get(id: string): Promise<TeamMemberDto> {
    const row = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Team member not found');
    return toDto(row);
  }

  async create(input: TeamMemberUpsertData): Promise<TeamMemberDto> {
    const row = await this.prisma.teamMember.create({
      data: {
        name: input.name,
        title: input.title,
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        twitterUrl: input.twitterUrl ?? null,
        isLeadership: input.isLeadership ?? false,
        published: input.published ?? true,
        order: input.order ?? 0,
      },
    });
    return toDto(row);
  }

  async update(id: string, input: TeamMemberUpsertData): Promise<TeamMemberDto> {
    const existing = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Team member not found');
    const row = await this.prisma.teamMember.update({
      where: { id },
      data: {
        name: input.name,
        title: input.title,
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        twitterUrl: input.twitterUrl ?? null,
        isLeadership: input.isLeadership ?? existing.isLeadership,
        published: input.published ?? existing.published,
        order: input.order ?? existing.order,
      },
    });
    return toDto(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Team member not found');
    await this.prisma.teamMember.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.teamMember.update({ where: { id }, data: { order: index } })),
    );
  }
}
