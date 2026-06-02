// teleCRM/app/manager/teams/[teamId]/add-members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * ✅ User Type
 */
interface User {
  id: string;
  email: string;
  designation: string;
}

/**
 * ✅ Team Type
 */
interface Team {
  id: string;
  name: string;
}

export default function AddMembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');

  /**
   * ✅ Fetch Team Name using /teams/my
   */
  useEffect(() => {
    const fetchTeamName = async () => {
      try {
        const res = await api.get('/teams/my');

        const responseData = res.data?.data ?? res.data;

        

        /**
         * Case 1: If backend returns array
         */
        if (Array.isArray(responseData)) {
          const matchedTeam = responseData.find(
            (team: Team) => team.id === teamId,
          );

          setTeamName(matchedTeam?.name || '');
        } else if (responseData?.id === teamId) {

        /**
         * Case 2: If backend returns single object
         */
          setTeamName(responseData.name);
        }
      } catch (error) {
        console.error('Failed to fetch team name:', error);
      }
    };

    if (teamId) {
      fetchTeamName();
    }
  }, [teamId]);

  /**
   * ✅ Fetch Available Users
   */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get(`/teams/${teamId}/available-users`);

        const usersArray = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? []);

        setUsers(usersArray);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      }
    };

    if (teamId) {
      fetchUsers();
    }
  }, [teamId]);

  /**
   * ✅ Add Member
   */
  const handleSubmit = async () => {
    if (!selectedUser) return;

    try {
      await api.post(`/teams/${teamId}/members`, {
        userIds: [selectedUser],
      });

      router.push('/manager');
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold">
            Add Member to Team
            {teamName ? ` - ${teamName}` : ''}
          </h2>

          <Select onValueChange={(val) => setSelectedUser(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select L3 User" />
            </SelectTrigger>

            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email} ({user.designation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!selectedUser}
          >
            Add Member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
