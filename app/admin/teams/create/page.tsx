//teleCRM/app/admin/teams/create/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { getAccessLevel } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  designation: string;
  accessLevel: "L1" | "L2" | "L3";
}

export default function CreateTeamPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [l2Users, setL2Users] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // ======================================================
  // 🔒 L1 ONLY ACCESS
  // ======================================================
  useEffect(() => {
    const accessLevel = getAccessLevel();
    if (accessLevel !== "L1") {
      router.replace("/login");
    }
  }, [router]);

  // ======================================================
  // 📥 FETCH L2 USERS
  // ======================================================
  useEffect(() => {
    api
      .get<User[]>("/users")
      .then((res) => {
        const l2s = res.data.filter((user) => user.accessLevel === "L2");
        setL2Users(l2s);
      })
      .catch(() => {
        alert("Failed to load L2 users");
      });
  }, []);

  // ======================================================
  // 🚀 SUBMIT
  // ======================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !managerId) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await api.post("/teams", {
        name,
        managerId,
      });

      alert("Team created successfully");
      router.push("/admin");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Button
        asChild
        variant={"outline"}
        className="bg-amber-300 text-black hover:bg-amber-400 rounded-full mb-2"
      >
        <Link href="/admin/teams">View Team</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Name */}
            <div className="space-y-1">
              <Label>Team Name</Label>
              <Input
                placeholder="Enter team name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Manager (L2) */}
            <div className="space-y-1">
              <Label>Team Manager (L2)</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select L2 manager" />
                </SelectTrigger>

                <SelectContent>
                  {l2Users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} — {user.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
