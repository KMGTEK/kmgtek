'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { ROLE_LABELS, STAFF_ROLES, staffUserUpsertSchema, type RoleName, type StaffUser, type StaffUserUpsertInput } from '@kmg/shared';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  SubmitButton,
  TextField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { PlusIcon, PencilIcon } from 'lucide-react';

export function StaffUserDialog({ user, onDone }: { user?: StaffUser; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useZodForm(staffUserUpsertSchema, {
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      roles: user?.roles ?? [],
      password: '',
      status: user?.status ?? 'ACTIVE',
    },
  });

  async function onSubmit(values: StaffUserUpsertInput) {
    try {
      const payload = { ...values, password: values.password || undefined };
      if (user) {
        await api.patch(`/admin/users/${user.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User invited');
      }
      setOpen(false);
      form.reset();
      onDone();
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {user ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit user">
            <PencilIcon className="size-4" />
          </Button>
        ) : (
          <Button>
            <PlusIcon className="size-4" /> New user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit user' : 'Invite staff user'}</DialogTitle>
          <DialogDescription>Staff users can sign in to the admin portal per their assigned roles.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField name="name" label="Name" required />
            <TextField name="email" label="Email" type="email" required autoComplete="off" />
            <TextField
              name="password"
              label="Password"
              type="password"
              placeholder={user ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
              autoComplete="new-password"
            />
            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => {
                const value = (field.value as RoleName[] | undefined) ?? [];
                return (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {STAFF_ROLES.map((role) => (
                          <label key={role} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                            <Checkbox
                              checked={value.includes(role)}
                              onCheckedChange={(checked) =>
                                field.onChange(checked ? [...value, role] : value.filter((item) => item !== role))
                              }
                            />
                            {ROLE_LABELS[role]}
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <SelectField
              name="status"
              label="Status"
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Invited', value: 'INVITED' },
                { label: 'Suspended', value: 'SUSPENDED' },
              ]}
            />
            <SubmitButton className="w-full">{user ? 'Save changes' : 'Send invite'}</SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
