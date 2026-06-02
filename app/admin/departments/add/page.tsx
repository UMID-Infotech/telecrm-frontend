//teleCRM/telecrm-frontend/app/admin/departments/add/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function AddDepartmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    try {
      setLoading(true);

      await api.post("/departments", {
        name,
      });

      // ✅ redirect back to dashboard (or department list later)
      router.push("/admin");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Button
        asChild
        variant={"outline"}
        className="bg-amber-300 text-black hover:bg-amber-400 rounded-full mb-2"
      >
        <Link href="/admin/departments">View Department List</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Add Department</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                placeholder="e.g. Sales, Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Department"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
