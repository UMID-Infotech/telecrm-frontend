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
 * ✅ Define proper User type
 */
interface User {
  id: string;
  email: string;
  designation: string;
}

export default function AddMembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  /**
   * ✅ Fetch available users using axios instance
   * JWT is auto attached by interceptor
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
   * ✅ Add member using axios
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
          <h2 className="text-xl font-semibold">Add Member to Team</h2>

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
