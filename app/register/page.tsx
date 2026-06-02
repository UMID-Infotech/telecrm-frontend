//app/register/page.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    await api.post("/auth/signup", {
      organizationName: formData.get("orgName"),
      organizationEmail: formData.get("orgEmail"),
      organizationPassword: formData.get("orgPassword"),
      adminEmail: formData.get("adminEmail"),
      adminPassword: formData.get("adminPassword"),
      adminDesignation: formData.get("designation"),
    });

    alert("Registered successfully. Please login.");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="orgName" placeholder="Organization Name" required />
            <Input name="orgEmail" placeholder="Organization Email" required />
            <Input name="orgPassword" type="password" placeholder="Org Password" required />
            <Input name="adminEmail" placeholder="Admin Email" required />
            <Input name="adminPassword" type="password" placeholder="Admin Password" required />
            <Input name="designation" placeholder="Admin Designation" required />
            <Button type="submit" disabled={loading} className="w-full">
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
