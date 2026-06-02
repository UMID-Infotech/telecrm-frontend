//teleCRM/app/admin/users/add/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { api } from "@/lib/api";
import Link from "next/link";

/**
 * Matches Department Prisma model
 */
interface Department {
  id: string;
  name: string;
}

export default function AddUserPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    designation: "",
    accessLevel: "L2",
    departmentId: "",
  });

  // ======================================================
  // FETCH DEPARTMENTS (ORG SAFE)
  // ======================================================
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get<Department[]>("/departments");
        setDepartments(res.data);
      } catch (error) {
        alert("Failed to load departments");
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ======================================================
  // SUBMIT FORM
  // ======================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.departmentId) {
      alert("Please select a department");
      return;
    }

    try {
      setLoading(true);

      await api.post("/users/create", {
        email: form.email,
        password: form.password,
        designation: form.designation,
        accessLevel: form.accessLevel,
        departmentId: form.departmentId,
      });

      alert("User created successfully");
      router.push("/admin");
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to create user");
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
        <Link href="/admin/users">View List</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </div>

            {/* Designation */}
            <div>
              <Label>Designation</Label>
              <Input
                required
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
              />
            </div>

            {/* Access Level */}
            <div>
              <Label>Access Level</Label>
              <Select
                value={form.accessLevel}
                onValueChange={(value) => handleChange("accessLevel", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Dropdown */}
            <div>
              <Label>Department</Label>
              <Select
                value={form.departmentId}
                onValueChange={(value) => handleChange("departmentId", value)}
                disabled={departmentsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      departmentsLoading
                        ? "Loading departments..."
                        : "Select department"
                    }
                  />
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

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
