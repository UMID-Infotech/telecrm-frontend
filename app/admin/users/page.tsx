//teleCRM/app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiPhoneCall, FiEdit2 } from 'react-icons/fi';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { api } from '@/lib/api';
import { ActionButton } from '@/components/common/action-button';

// ======================================================
// TYPES
// ======================================================

interface User {
  id: string;
  email: string;
  designation: string;
  accessLevel: 'L1' | 'L2' | 'L3';
  departmentId: string | null;
  teamId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

interface EditForm {
  email: string;
  designation: 'Manager' | 'Agent' | '';
  accessLevel: 'L2' | 'L3';
  departmentId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// ======================================================
// HELPERS
// ======================================================

function accessLevelFromDesignation(designation: string): 'L2' | 'L3' {
  return designation === 'Manager' ? 'L2' : 'L3';
}

const ACCESS_LEVEL_BADGE: Record<string, 'default' | 'secondary' | 'outline'> =
  {
    L1: 'default',
    L2: 'secondary',
    L3: 'outline',
  };

// ======================================================
// PAGE
// ======================================================

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    email: '',
    designation: '',
    accessLevel: 'L3',
    departmentId: '',
    status: 'ACTIVE',
  });
  const [editLoading, setEditLoading] = useState(false);

  // ======================================================
  // FETCH
  // ======================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, departmentsRes] = await Promise.all([
          api.get<User[]>('/users'),
          api.get<Department[]>('/departments'),
        ]);
        setUsers(usersRes.data);
        setDepartments(departmentsRes.data);
      } catch {
        alert('Failed to load users or departments');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ======================================================
  // DEPARTMENT MAP
  // ======================================================
  const departmentMap = departments.reduce<Record<string, string>>(
    (acc, dept) => {
      acc[dept.id] = dept.name;
      return acc;
    },
    {},
  );

  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================
  const openEditModal = (user: User) => {
    setEditUserId(user.id);
    setEditForm({
      email: user.email,
      designation:
        user.designation === 'Manager' || user.designation === 'Agent'
          ? user.designation
          : '',
      accessLevel: accessLevelFromDesignation(user.designation),
      departmentId: user.departmentId ?? '',
      status: user.status,
    });
    setEditOpen(true);
  };

  // ======================================================
  // HANDLE EDIT FIELD CHANGES
  // ======================================================
  const handleDesignationChange = (value: 'Manager' | 'Agent') => {
    setEditForm((prev) => ({
      ...prev,
      designation: value,
      accessLevel: accessLevelFromDesignation(value),
    }));
  };

  const handleEditField = <K extends keyof EditForm>(
    key: K,
    value: EditForm[K],
  ) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // ======================================================
  // SUBMIT EDIT
  // ======================================================
  const handleEditSubmit = async () => {
    if (!editUserId) return;

    if (!editForm.designation) {
      alert('Please select a designation');
      return;
    }
    if (!editForm.departmentId) {
      alert('Please select a department');
      return;
    }

    try {
      setEditLoading(true);
      const updated = await api.patch<User>(`/users/${editUserId}`, {
        designation: editForm.designation,
        accessLevel: editForm.accessLevel,
        departmentId: editForm.departmentId,
        status: editForm.status,
      });

      // Update local list
      setUsers((prev) =>
        prev.map((u) => (u.id === editUserId ? { ...u, ...updated.data } : u)),
      );

      setEditOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <Card className="shadow-sm border border-border">
        {/* ── Header ── */}
        <CardHeader className="border-b border-border bg-muted/40 rounded-t-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold tracking-tight">
              User Management
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        {/* ── Body ── */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              No users found for this organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Designation
                    </TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Department
                    </TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Access Level
                    </TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                      Created
                    </TableHead>
                    <TableHead className="pr-6 font-medium text-xs uppercase tracking-wide text-muted-foreground text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Email */}
                      <TableCell className="pl-6 font-medium text-sm">
                        {user.email}
                      </TableCell>

                      {/* Designation */}
                      <TableCell className="text-sm text-muted-foreground">
                        {user.designation}
                      </TableCell>

                      {/* Department */}
                      <TableCell className="text-sm text-muted-foreground">
                        {user.departmentId
                          ? (departmentMap[user.departmentId] ?? '—')
                          : '—'}
                      </TableCell>

                      {/* Access Level */}
                      <TableCell>
                        <Badge
                          variant={
                            ACCESS_LEVEL_BADGE[user.accessLevel] ?? 'secondary'
                          }
                          className="text-xs font-mono"
                        >
                          {user.accessLevel}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            user.status === 'ACTIVE' ? 'default' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {user.status}
                        </Badge>
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {/* Call */}
                          <ActionButton
                            size="sm"
                            className="!bg-green-600 hover:!bg-green-700 text-white flex items-center gap-1.5 cursor-pointer h-8 px-3 text-xs rounded-md"
                            onClick={() =>
                              console.log('Call user:', user.email)
                            }
                          >
                            <FiPhoneCall className="h-3.5 w-3.5" />
                            Call
                          </ActionButton>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                            onClick={() => openEditModal(user)}
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          EDIT MODAL
      ============================================================ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Edit User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Email — read-only */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                value={editForm.email}
                readOnly
                className="bg-muted cursor-not-allowed text-muted-foreground text-sm"
              />
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Designation</Label>
              <Select
                value={editForm.designation}
                onValueChange={(v) =>
                  handleDesignationChange(v as 'Manager' | 'Agent')
                }
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access Level — auto-derived, read-only */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Access Level</Label>
              <Input
                value={editForm.accessLevel}
                readOnly
                className="bg-muted cursor-not-allowed text-muted-foreground font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Auto-set: Manager → L2, Agent → L3
              </p>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Department</Label>
              <Select
                value={editForm.departmentId}
                onValueChange={(v) => handleEditField('departmentId', v)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status — matches Prisma Status enum exactly */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  handleEditField('status', v as 'ACTIVE' | 'INACTIVE')
                }
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-400 hover:bg-amber-500 text-black font-medium"
              onClick={handleEditSubmit}
              disabled={editLoading}
            >
              {editLoading ? 'Updating…' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
