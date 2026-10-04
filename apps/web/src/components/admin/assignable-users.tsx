'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

/** `GET /admin/users/assignable?permission=…` — interviewer / assignee / hiring-manager pickers. */
export function useAssignableUsers(permission?: string) {
  return useQuery({
    queryKey: qk.admin.users.assignable(permission),
    queryFn: () => api.getData<AssignableUser[]>('/admin/users/assignable', { query: { permission } }),
    staleTime: 5 * 60 * 1000,
  });
}
