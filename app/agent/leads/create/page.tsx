// teleCRM/app/agent/leads/create/page.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type FieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "DROPDOWN";
type Priority = "HIGH" | "MEDIUM" | "LOW";

interface DynamicField {
  id: string;
  key: string;
  type: FieldType;
  value: any;
  dropdownOptions?: string;
}

export default function CreateLeadPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [loading, setLoading] = useState(false);

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), key: "", type: "TEXT", value: "" },
    ]);
  };

  const updateField = (id: string, updated: Partial<DynamicField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updated } : f)));
  };

  const removeField = (id: string) =>
    setFields(fields.filter((f) => f.id !== id));

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      showToast("Name and Phone are required", "destructive");
      return;
    }

    const dynamicData: Record<string, any> = {};
    for (const field of fields) {
      if (field.key.trim()) dynamicData[field.key] = field.value;
    }

    setLoading(true);
    try {
      await api.post("/leads", { name, phone, priority, data: dynamicData });
      // showToast('Lead submitted! It will be reviewed for approval.', 'success');
      showToast("Lead created and assigned to you!", "success");
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to create lead",
        "destructive",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-2xl font-bold">Create Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your lead will be submitted for approval by a manager.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Full Name *</Label>
            <Input
              placeholder="Lead name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Phone *</Label>
            <Input
              placeholder="+91 9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as Priority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">🔴 High</SelectItem>
                <SelectItem value="MEDIUM">🟠 Medium</SelectItem>
                <SelectItem value="LOW">⚪ Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Additional Data</CardTitle>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus size={14} className="mr-1" /> Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No extra fields
            </p>
          )}
          {fields.map((field) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Key</Label>
                  <Input
                    placeholder="field_key"
                    value={field.key}
                    onChange={(e) =>
                      updateField(field.id, { key: e.target.value })
                    }
                  />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v) =>
                      updateField(field.id, { type: v as FieldType, value: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="NUMBER">Number</SelectItem>
                      <SelectItem value="BOOLEAN">Boolean</SelectItem>
                      <SelectItem value="DATE">Date</SelectItem>
                      <SelectItem value="DROPDOWN">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(field.id)}
                  className="self-end text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                {field.type === "TEXT" && (
                  <Input
                    value={field.value}
                    onChange={(e) =>
                      updateField(field.id, { value: e.target.value })
                    }
                  />
                )}
                {field.type === "NUMBER" && (
                  <Input
                    type="number"
                    value={field.value}
                    onChange={(e) =>
                      updateField(field.id, { value: Number(e.target.value) })
                    }
                  />
                )}
                {field.type === "BOOLEAN" && (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) =>
                      updateField(field.id, { value: v === "true" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {field.type === "DATE" && (
                  <Input
                    type="date"
                    value={field.value}
                    onChange={(e) =>
                      updateField(field.id, { value: e.target.value })
                    }
                  />
                )}
                {field.type === "DROPDOWN" && (
                  <Input
                    placeholder="Comma-separated: a, b, c"
                    value={field.dropdownOptions ?? ""}
                    onChange={(e) =>
                      updateField(field.id, { dropdownOptions: e.target.value })
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? "Submitting…" : "Submit Lead"}
        </Button>
      </div>
    </div>
  );
}
