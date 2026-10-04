import { Injectable, NotFoundException } from '@nestjs/common';
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type RoleName, type RoleWithPermissions } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Resolves roles → permissions. The JWT carries the resolved permission list, so
 * guards never need a database round-trip.
 */
@Injectable()
export class RbacService {
  private cache: Map<string, Permission[]> | null = null;
  private cachedAt = 0;
  private readonly ttlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }

  private async rolePermissionMap(): Promise<Map<string, Permission[]>> {
    if (this.cache && Date.now() - this.cachedAt < this.ttlMs) return this.cache;

    const roles = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
    const map = new Map<string, Permission[]>();
    for (const role of roles) {
      map.set(
        role.name,
        role.permissions.map((rp) => rp.permission.key as Permission),
      );
    }
    // Fall back to the static mapping for roles that are not seeded yet.
    for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      if (!map.has(name)) map.set(name, permissions);
    }
    this.cache = map;
    this.cachedAt = Date.now();
    return map;
  }

  /** Union of the permissions granted by the given roles. */
  async permissionsForRoles(roles: RoleName[]): Promise<Permission[]> {
    const map = await this.rolePermissionMap();
    const set = new Set<Permission>();
    for (const role of roles) {
      for (const permission of map.get(role) ?? []) set.add(permission);
    }
    return [...set];
  }

  /** Roles + resolved permissions for a user, used when minting an access token. */
  async accessForUser(userId: string): Promise<{ roles: RoleName[]; permissions: Permission[] }> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roles = rows.map((row) => row.role.name as RoleName);
    return { roles, permissions: await this.permissionsForRoles(roles) };
  }

  async listRoles(): Promise<RoleWithPermissions[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name as RoleName,
      description: role.description,
      permissions: role.permissions.map((rp) => rp.permission.key as Permission),
      userCount: role._count.users,
    }));
  }

  /** Replace a role's permission set (unknown keys are rejected). */
  async setRolePermissions(roleId: string, permissions: Permission[]): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const valid = permissions.filter((key) => (PERMISSIONS as readonly string[]).includes(key));
    const rows = await this.prisma.permission.findMany({ where: { key: { in: valid } } });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: rows.map((permission) => ({ roleId, permissionId: permission.id })),
        skipDuplicates: true,
      }),
    ]);
    this.invalidate();

    const updated = (await this.listRoles()).find((r) => r.id === roleId);
    if (!updated) throw new NotFoundException('Role not found');
    return updated;
  }
}
