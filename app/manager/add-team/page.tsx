// telecrm/app/manager/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { X } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Member {
  id: string;
  email: string;
  designation: string;
}

interface Team {
  id: string;
  name: string;
  members: Member[];
}

export default function ManagerDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams/my');
      const data = res.data?.data ?? res.data;
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleRemoveMember = async (
    teamId: string,
    memberId: string,
    memberEmail: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // prevent dropdown close
    setRemovingId(memberId);

    try {
      await api.delete(`/teams/${teamId}/members/${memberId}`);

      // Optimistically update local state
      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? {
                ...team,
                members: team.members.filter((m) => m.id !== memberId),
              }
            : team,
        ),
      );

      toast.success('Member removed', {
        description: `${memberEmail} has been removed from the team.`,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? 'Failed to remove member.';
      // error
      toast.error('Error', {
        description: message,
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">My Teams</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Members Count</TableHead>
            <TableHead>View Members</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>{team.name}</TableCell>

              <TableCell>{team.members.length}</TableCell>

              {/* ✅ View Members Dropdown with Remove */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      View Members ({team.members.length})
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="min-w-[260px]">
                    {team.members.length === 0 && (
                      <DropdownMenuItem disabled>No members</DropdownMenuItem>
                    )}

                    {team.members.map((member) => {
                      const displayName = member.email
                        ? member.email.split('@')[0]
                        : '';

                      return (
                        <DropdownMenuItem
                          key={member.id}
                          className="flex items-center justify-between gap-2"
                          onSelect={(e) => e.preventDefault()} // keep dropdown open
                        >
                          <span className="flex flex-col">
                            <span className="capitalize font-medium">
                              {displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {member.email} · {member.designation}
                            </span>
                          </span>

                          <button
                            onClick={(e) =>
                              handleRemoveMember(
                                team.id,
                                member.id,
                                member.email,
                                e,
                              )
                            }
                            disabled={removingId === member.id}
                            className="ml-2 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                            title="Remove member"
                          >
                            <X size={14} />
                          </button>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>

              <TableCell>
                <Button
                  onClick={() =>
                    router.push(`/manager/teams/${team.id}/add-members`)
                  }
                >
                  Add Members
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
