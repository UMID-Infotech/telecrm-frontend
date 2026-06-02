//teleCRM/app/admin/teams/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { getAccessLevel } from '@/lib/auth';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Manager {
  id: string;
  email: string;
  designation: string;
}

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  managerId: string;
  departmentId: string | null;
  manager: Manager;
  department: Department | null;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Edit Modal Component
// ─────────────────────────────────────────────

interface EditTeamModalProps {
  team: Team;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: Team) => void;
}

function EditTeamModal({ team, open, onClose, onUpdated }: EditTeamModalProps) {
  const [name, setName] = useState(team.name);
  const [managerId, setManagerId] = useState(team.managerId);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when team changes
  useEffect(() => {
    setName(team.name);
    setManagerId(team.managerId);
    setError(null);
  }, [team]);

  // Fetch available L2 managers for this team's department
  useEffect(() => {
    if (!open) return;

    setLoadingManagers(true);
    api
      .get<Manager[]>(`/teams/${team.id}/managers`)
      .then((res) => setManagers(res.data))
      .catch(() => setError('Failed to load managers'))
      .finally(() => setLoadingManagers(false));
  }, [open, team.id]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const res = await api.patch<Team>(`/teams/${team.id}`, {
        name: name.trim(),
        managerId,
      });

      onUpdated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Department (read-only context) */}
          {team.department && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Department
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-normal">
                  {team.department.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  (managers shown below belong to this department)
                </span>
              </div>
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-team-name">Team Name</Label>
            <Input
              id="edit-team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          {/* Manager Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-manager">Team Manager (L2)</Label>

            {loadingManagers ? (
              <div className="h-9 rounded-md border bg-muted animate-pulse" />
            ) : (
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger id="edit-manager" className="w-full">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No available managers in this department
                    </SelectItem>
                  ) : (
                    managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.email}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.designation}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingManagers}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // ======================================================
  // 🔒 L1 ONLY ACCESS
  // ======================================================
  useEffect(() => {
    const accessLevel = getAccessLevel();
    if (accessLevel !== 'L1') {
      router.replace('/login');
    }
  }, [router]);

  // ======================================================
  // 📥 FETCH TEAMS
  // ======================================================
  const fetchTeams = useCallback(() => {
    setLoading(true);
    api
      .get<Team[]>('/teams')
      .then((res) => setTeams(res.data))
      .catch(() => alert('Failed to load teams'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // ======================================================
  // 🔄 UPDATE LOCAL STATE AFTER EDIT
  // ======================================================
  function handleTeamUpdated(updated: Team) {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? {
              ...updated,
              // _count.members isn't returned from PATCH, preserve existing
              membersCount: t.membersCount,
            }
          : t,
      ),
    );
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-10 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-md bg-muted animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Teams</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {teams.length} team{teams.length !== 1 ? 's' : ''} in your
              organization
            </p>
          </div>

          <Button onClick={() => router.push('/admin/teams/create')}>
            + Create Team
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Team Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    No teams found. Create your first team.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    {/* Team Name */}
                    <TableCell className="font-semibold">{team.name}</TableCell>

                    {/* Department */}
                    <TableCell>
                      {team.department ? (
                        <Badge variant="outline">{team.department.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Manager */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {team.manager.email}
                        </span>
                      </div>
                    </TableCell>

                    {/* Designation */}
                    <TableCell className="text-sm text-muted-foreground">
                      {team.manager.designation}
                    </TableCell>

                    {/* Members */}
                    <TableCell className="text-center">
                      <Badge variant="secondary">{team.membersCount}</Badge>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(team.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTeam(team)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          open={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          onUpdated={handleTeamUpdated}
        />
      )}
    </div>
  );
}
