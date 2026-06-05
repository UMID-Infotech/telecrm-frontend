// teleCRM/app/superadmin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserRow {
  id: string;
  email: string;
  designation: string;
  accessLevel: "L1" | "L2" | "L3";
  status: "ACTIVE" | "INACTIVE";
  organizationId: string | null;
  createdAt: string;
  organization: { name: string } | null;
}

const levelColor: Record<string, string> = {
  L1: "bg-violet-950/60 text-violet-400 border-violet-800/40",
  L2: "bg-sky-950/60 text-sky-400 border-sky-800/40",
  L3: "bg-amber-950/60 text-amber-400 border-amber-800/40",
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = () => {
    api
      .get<UserRow[]>("/superadmin/users")
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (id: string, current: "ACTIVE" | "INACTIVE") => {
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await api.patch(`/superadmin/users/${id}/status`, { status: next });
    fetchUsers();
  };

  const openDeleteDialog = (user: UserRow) => {
    setDeleteError(null);
    setDeleteTarget(user);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/superadmin/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const isL1 = deleteTarget?.accessLevel === "L1";

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">All Users</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Every user across all organizations
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                  User
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden md:table-cell">
                  Organization
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">
                  Level
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.email}</p>
                        <p className="text-zinc-600 text-xs">
                          {user.designation}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                    {user.organization?.name ?? (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${levelColor[user.accessLevel]}`}
                    >
                      {user.accessLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.status === "ACTIVE"
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {user.status === "ACTIVE" ? (
                        <CheckCircle size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-700"
                        >
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900 border-zinc-700 text-zinc-200"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-zinc-800"
                          onClick={() => toggleStatus(user.id, user.status)}
                        >
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-700" />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-2"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 size={13} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-10 text-zinc-600">
              No users found
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={closeDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle size={18} className="text-red-400" />
              {isL1 ? "Delete Organization & Admin" : "Delete User"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2 space-y-2">
              {isL1 ? (
                <>
                  <span className="block">
                    You are about to permanently delete the L1 admin{" "}
                    <span className="text-white font-medium">
                      {deleteTarget?.email}
                    </span>{" "}
                    and their entire organization{" "}
                    <span className="text-white font-medium">
                      {deleteTarget?.organization?.name}
                    </span>
                    .
                  </span>
                  <span className="block mt-2 text-red-400/80 text-xs font-medium bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                    ⚠ This will permanently delete all users, teams,
                    departments, leads, conversations, and every other record
                    belonging to this organization. This action cannot be
                    undone.
                  </span>
                </>
              ) : (
                <span className="block">
                  Are you sure you want to delete{" "}
                  <span className="text-white font-medium">
                    {deleteTarget?.email}
                  </span>
                  ? This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-700"
              onClick={closeDeleteDialog}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? "Deleting…"
                : isL1
                  ? "Delete Everything"
                  : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
