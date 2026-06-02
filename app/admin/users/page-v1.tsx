//teleCRM/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { FiPhoneCall } from "react-icons/fi";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import { ActionButton } from "@/components/common/action-button";

/**
 * Matches GET /users response
 */
interface User {
  id: string;
  email: string;
  designation: string;
  accessLevel: "L1" | "L2" | "L3";
  departmentId: string | null;
  teamId: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

/**
 * Matches Department Prisma model
 */
interface Department {
  id: string;
  name: string;
}

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // FETCH USERS + DEPARTMENTS
  // ======================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, departmentsRes] = await Promise.all([
          api.get<User[]>("/users"),
          api.get<Department[]>("/departments"),
        ]);

        setUsers(usersRes.data);
        setDepartments(departmentsRes.data);
      } catch (error) {
        alert("Failed to load users or departments");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ======================================================
  // MAP departmentId → departmentName
  // ======================================================
  const departmentMap = departments.reduce<Record<string, string>>(
    (acc, dept) => {
      acc[dept.id] = dept.name;
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-6xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users found for this organization.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Email</TableHead>
                  <TableHead className="text-left">Designation</TableHead>
                  <TableHead className="text-left">Department</TableHead>
                  <TableHead className="text-left">Access Level</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Action</TableHead>
                  <TableHead className="text-left">Created At</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>

                    <TableCell>{user.designation}</TableCell>

                    <TableCell>
                      {user.departmentId
                        ? departmentMap[user.departmentId] || "—"
                        : "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">{user.accessLevel}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          user.status === "ACTIVE" ? "default" : "destructive"
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>

                    {/* 📞 CALL ACTION */}
                    <TableCell>
                      <ActionButton
                        size="sm"
                        className="!bg-green-600 !hover:bg-green-700 text-white flex items-center gap-2 cursor-pointer"
                        onClick={() => console.log("Call user:", user.email)}
                      >
                        <FiPhoneCall className="h-4 w-4" />
                        Call
                      </ActionButton>
                    </TableCell>

                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
