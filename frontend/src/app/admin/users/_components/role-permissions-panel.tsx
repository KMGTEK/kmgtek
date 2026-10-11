'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { PERMISSIONS, ROLE_LABELS, type Permission, type RoleWithPermissions } from '@kmg/shared';

import { EmptyState, ErrorState, StatsSkeleton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, useCan } from '@/lib/auth';
import { cn } from '@/lib/utils';

/** Permissions grouped by resource prefix (`"jobs:read"` → group `"jobs"`). */
const PERMISSION_GROUPS = PERMISSIONS.reduce<Record<string, Permission[]>>((groups, permission) => {
  const [resource] = permission.split(':');
  groups[resource] = groups[resource] ? [...groups[resource], permission] : [permission];
  return groups;
}, {});

function RoleCard({ role, canEdit, onSaved }: { role: RoleWithPermissions; canEdit: boolean; onSaved: () => void }) {
  const [selected, setSelected] = React.useState<Set<Permission>>(new Set(role.permissions));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelected(new Set(role.permissions));
  }, [role.permissions]);

  const dirty =
    selected.size !== role.permissions.length || role.permissions.some((permission) => !selected.has(permission));

  function toggle(permission: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function save() {
    try {
      setSaving(true);
      await api.put(`/admin/roles/${role.id}/permissions`, { permissions: Array.from(selected) });
      toast.success(`${ROLE_LABELS[role.name]} permissions updated`);
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            {ROLE_LABELS[role.name]}
            <Badge variant="secondary">{role.userCount} user{role.userCount === 1 ? '' : 's'}</Badge>
          </CardTitle>
          {role.description ? <p className="text-muted-foreground mt-1 text-sm">{role.description}</p> : null}
        </div>
        {canEdit ? (
          <Button size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PERMISSION_GROUPS).map(([resource, permissions]) => (
            <div key={resource} className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{resource}</p>
              <div className="space-y-1.5">
                {permissions.map((permission) => (
                  <label
                    key={permission}
                    className={cn('flex items-center gap-2 text-sm', !canEdit && 'opacity-70')}
                  >
                    <Checkbox
                      checked={selected.has(permission)}
                      disabled={!canEdit || role.name === 'SUPER_ADMIN'}
                      onCheckedChange={() => toggle(permission)}
                    />
                    {permission.split(':')[1]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RolePermissionsPanel() {
  const queryClient = useQueryClient();
  const canEditRoles = useCan('roles:write');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.roles,
    queryFn: () => api.getData<RoleWithPermissions[]>('/admin/roles'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.admin.roles });

  if (isLoading) return <StatsSkeleton count={3} />;
  if (error) return <ErrorState error={error} onAction={() => refetch()} />;
  if (!data?.length) return <EmptyState title="No roles found" />;

  return (
    <div className="space-y-4">
      <Can permission="roles:write">
        <p className="text-muted-foreground text-sm">
          SUPER_ADMIN always has every permission and cannot be edited.
        </p>
      </Can>
      {data.map((role) => (
        <RoleCard key={role.id} role={role} canEdit={canEditRoles} onSaved={invalidate} />
      ))}
    </div>
  );
}
