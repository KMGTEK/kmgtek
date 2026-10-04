import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import {
  ROLES,
  STAFF_ROLES,
  type Paginated,
  type Permission,
  type RoleName,
  type StaffUser,
} from '@kmg/shared';
import { hashPassword } from '../../common/utils/password.util';
import { paginate, parsePagination, parseSort } from '../../common/utils/pagination.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';

export interface StaffListQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  role?: string;
  status?: string;
}

export interface StaffUserInput {
  name: string;
  email: string;
  roles: string[];
  password?: string;
  status?: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

type UserWithRoles = User & { roles: Array<{ role: { name: string } }> };

const SORTABLE = ['createdAt', 'name', 'email', 'lastLoginAt', 'status'] as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  static toStaffUser(user: UserWithRoles): StaffUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((r) => r.role.name as RoleName),
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
  }

  async list(query: StaffListQuery): Promise<Paginated<StaffUser>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      roles: {
        some: { role: { name: { in: query.role ? [query.role] : STAFF_ROLES } } },
      },
      ...(query.status ? { status: query.status as StaffUser['status'] } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: parseSort(query.sort, SORTABLE),
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows.map(UsersService.toStaffUser), total, { page, pageSize });
  }

  async get(id: string): Promise<StaffUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return UsersService.toStaffUser(user);
  }

  async create(input: StaffUserInput): Promise<StaffUser> {
    const roleIds = await this.resolveRoles(input.roles);
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        status: input.password ? (input.status ?? 'ACTIVE') : 'INVITED',
        passwordHash: input.password ? await hashPassword(input.password) : null,
        passwordChangedAt: input.password ? new Date() : null,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
    return UsersService.toStaffUser(user);
  }

  async update(id: string, input: Partial<StaffUserInput>): Promise<StaffUser> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    if (input.password) {
      data.passwordHash = await hashPassword(input.password);
      data.passwordChangedAt = new Date();
      // Password change invalidates existing sessions.
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (input.roles?.length) {
      const roleIds = await this.resolveRoles(input.roles);
      await this.prisma.$transaction([
        this.prisma.userRole.deleteMany({ where: { userId: id } }),
        this.prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
          skipDuplicates: true,
        }),
      ]);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
    return UsersService.toStaffUser(updated);
  }

  /** Soft delete + session revocation. The last SUPER_ADMIN cannot be removed. */
  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.roles.some((r) => r.role.name === ROLES.SUPER_ADMIN)) {
      const admins = await this.prisma.user.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          roles: { some: { role: { name: ROLES.SUPER_ADMIN } } },
        },
      });
      if (admins <= 1) throw new BadRequestException('Cannot delete the last super admin');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'SUSPENDED' },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /**
   * Staff pickers (interviewer / assignee / hiring manager). When a permission is
   * given, only users whose roles grant it are returned.
   */
  async assignable(permission?: Permission): Promise<Array<{ id: string; name: string; email: string }>> {
    let roleNames: string[] = [...STAFF_ROLES];
    if (permission) {
      const roles = await this.prisma.role.findMany({
        where: { permissions: { some: { permission: { key: permission } } } },
        select: { name: true },
      });
      roleNames = roles.map((role) => role.name);
      if (!roleNames.includes(ROLES.SUPER_ADMIN)) roleNames.push(ROLES.SUPER_ADMIN);
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { name: { in: roleNames } } } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return users;
  }

  private async resolveRoles(names: string[]): Promise<string[]> {
    const unique = [...new Set(names)];
    const roles = await this.prisma.role.findMany({ where: { name: { in: unique } } });
    if (roles.length !== unique.length) {
      const found = new Set(roles.map((role) => role.name));
      throw new BadRequestException(`Unknown role(s): ${unique.filter((n) => !found.has(n)).join(', ')}`);
    }
    this.rbac.invalidate();
    return roles.map((role) => role.id);
  }
}
