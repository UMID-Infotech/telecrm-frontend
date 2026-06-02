// teleCRM/telecrm-frontend/app/admin/departments/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

interface Manager {
  id: string;
  email: string;
  designation: string;
}

interface Department {
  id: string;
  name: string;
  createdAt: string;
  manager: Manager | null;
  managers: Manager[];
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditDepartmentModal({
  department,
  onClose,
  onUpdated,
}: {
  department: Department;
  onClose: () => void;
  onUpdated: (updated: Department) => void;
}) {
  const [name, setName] = useState(department.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Department name is required');
      return;
    }

    if (name.trim().toLowerCase() === department.name.toLowerCase()) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const res = await api.patch<Department>(`/departments/${department.id}`, {
        name: name.trim(),
      });
      onUpdated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Department</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="dept-name">Department Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales, Support"
              autoFocus
              className="capitalize"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get<Department[]>('/departments');
      setDepartments(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdated = (updated: Department) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === updated.id
          ? { ...updated, managers: d.managers, manager: d.manager }
          : d,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Departments</h1>
        <Link href="/admin/departments/add">
          <Button>Add Department</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department List</CardTitle>
        </CardHeader>

        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading departments...</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && departments.length === 0 && (
            <p className="text-sm text-muted-foreground">No departments found</p>
          )}

          {!loading && departments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Manager(s)</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    {/* Name */}
                    <TableCell className="capitalize font-medium">
                      {dept.name}
                    </TableCell>

                    {/* Manager(s) */}
                    <TableCell>
                      {dept.managers && dept.managers.length > 0 ? (
                        <div className="space-y-2">
                          {dept.managers.map((mgr) => (
                            <div key={mgr.id}>
                              <p className="text-sm font-medium text-gray-800">
                                {mgr.designation}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {mgr.email}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                          Assign a manager
                        </span>
                      )}
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDept(dept)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingDept && (
        <EditDepartmentModal
          department={editingDept}
          onClose={() => setEditingDept(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}