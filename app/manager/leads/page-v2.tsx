// teleCRM/app/manager/leads/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  phone: string;
  approvalStatus: string;
  distributionStage: "L1_POOL" | "L2_POOL" | "AGENT_OWNED" | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  assignedToUserId?: string;
  assignedToUser?: { id: string; email: string; designation: string };
  managerId?: string;
}

interface Agent {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  _count: { assignedLeads: number };
}

const priorityBadge = (p: Lead["priority"]) => {
  const cls: Record<Lead["priority"], string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    LOW: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls[p]}`}
    >
      {p}
    </span>
  );
};

const stageBadge = (stage: Lead["distributionStage"]) => {
  if (!stage) return null;
  const cls: Record<NonNullable<Lead["distributionStage"]>, string> = {
    L1_POOL: "bg-yellow-100 text-yellow-800",
    L2_POOL: "bg-blue-100 text-blue-800",
    AGENT_OWNED: "bg-green-100 text-green-800",
  };
  const labels: Record<NonNullable<Lead["distributionStage"]>, string> = {
    L1_POOL: "L1 Pool",
    L2_POOL: "Team Pool",
    AGENT_OWNED: "Assigned",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls[stage]}`}
    >
      {labels[stage]}
    </span>
  );
};

// ─── Select-All Checkbox ──────────────────────────────────────────────────────
// Uses the indeterminate DOM property which isn't a React prop, so we use a ref.
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="rounded"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManagerLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"POOL" | "ASSIGNED">("POOL");

  // Selection mode — activated when the user clicks "Distribute" on any row
  const [selectionMode, setSelectionMode] = useState(false);

  // Distribution dialog
  const [distDialog, setDistDialog] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [distMode, setDistMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [distAgentId, setDistAgentId] = useState("");
  const [distLoading, setDistLoading] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, agentsRes] = await Promise.all([
        api.get("/leads"),
        api.get("/leads/distribution/agents"),
      ]);
      setLeads(leadsRes.data?.data ?? leadsRes.data ?? []);
      setAgents(agentsRes.data?.data ?? agentsRes.data ?? []);
    } catch {
      showToast("Failed to load data", "destructive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const poolLeads = leads.filter((l) => l.distributionStage === "L2_POOL");
  const assignedLeads = leads.filter(
    (l) => l.distributionStage === "AGENT_OWNED",
  );
  const displayedLeads = activeTab === "POOL" ? poolLeads : assignedLeads;

  // ─── Select-All derived state ───────────────────────────────────────────────
  const allPoolIds = poolLeads.map((l) => l.id);
  const isAllSelected =
    allPoolIds.length > 0 &&
    allPoolIds.every((id) => selectedLeadIds.includes(id));
  const isSomeSelected =
    !isAllSelected && allPoolIds.some((id) => selectedLeadIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds((prev) =>
        Array.from(new Set([...prev, ...allPoolIds])),
      );
    } else {
      setSelectedLeadIds((prev) =>
        prev.filter((id) => !allPoolIds.includes(id)),
      );
    }
  };

  const toggleLeadSelect = (id: string) =>
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // ─── Enter selection mode from a single row's Distribute button ─────────────
  // Pre-selects that one lead and reveals checkboxes for all rows.
  const enterSelectionMode = (leadId: string) => {
    setSelectedLeadIds([leadId]);
    setSelectionMode(true);
  };

  // ─── Cancel selection mode ──────────────────────────────────────────────────
  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedLeadIds([]);
  };

  // ─── Open distribution dialog ───────────────────────────────────────────────
  const openDistDialog = () => {
    if (selectedLeadIds.length === 0) {
      showToast("Select at least one lead from the pool", "destructive");
      return;
    }
    setDistDialog(true);
  };

  const distribute = async () => {
    if (distMode === "MANUAL" && !distAgentId) {
      showToast("Select an agent for manual distribution", "destructive");
      return;
    }
    setDistLoading(true);
    try {
      const payload: any = { leadIds: selectedLeadIds, mode: distMode };
      if (distMode === "MANUAL") payload.agentId = distAgentId;

      await api.post("/leads/distribute/agent", payload);
      showToast(
        `${selectedLeadIds.length} lead(s) assigned to agent`,
        "success",
      );
      setDistDialog(false);
      setSelectedLeadIds([]);
      setDistAgentId("");
      setSelectionMode(false);
      fetchData();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Distribution failed",
        "destructive",
      );
    } finally {
      setDistLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Distribute leads from your team pool to agents (L2 → L3 pipeline)
          </p>
        </div>

        {/* When in selection mode, show Assign + Cancel in the header */}
        {selectionMode && activeTab === "POOL" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={cancelSelectionMode}>
              Cancel
            </Button>
            <Button
              onClick={openDistDialog}
              disabled={selectedLeadIds.length === 0}
            >
              Assign to Agent ({selectedLeadIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Team Pool", count: poolLeads.length, cls: "bg-blue-50" },
          {
            label: "Agent Assigned",
            count: assignedLeads.length,
            cls: "bg-green-50",
          },
          { label: "Total Agents", count: agents.length, cls: "bg-slate-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agents load overview */}
      {agents.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Agent Workload</p>
          <div className="flex flex-wrap gap-3">
            {agents.map((a) => {
              const load = a._count?.assignedLeads ?? 0;
              const limit = a.activeTicketLimit ?? 1;
              const pct = Math.min(100, Math.round((load / limit) * 100));
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 text-xs border rounded px-3 py-2 bg-white"
                >
                  <span className="font-medium">{a.email.split("@")[0]}</span>
                  <span className="text-muted-foreground">
                    {load}/{limit}
                  </span>
                  <div className="w-16 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        pct >= 100
                          ? "bg-red-500"
                          : pct >= 70
                            ? "bg-orange-400"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "POOL" as const, label: `Team Pool (${poolLeads.length})` },
          {
            key: "ASSIGNED" as const,
            label: `Assigned (${assignedLeads.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              // Leaving POOL tab cancels selection mode
              if (tab.key !== "POOL") cancelSelectionMode();
              else setSelectedLeadIds([]);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Selection-mode info banner */}
      {activeTab === "POOL" && selectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-blue-800">
            <strong>{selectedLeadIds.length}</strong> lead(s) selected — use the{" "}
            <strong>select-all checkbox</strong> in the header to pick every
            lead at once, or tick individual rows.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={cancelSelectionMode}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={openDistDialog}
              disabled={selectedLeadIds.length === 0}
            >
              Assign ({selectedLeadIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox column — always present in POOL tab.
                  In normal mode: empty cell (placeholder for alignment).
                  In selection mode: shows the select-all checkbox. */}
              {activeTab === "POOL" && (
                <TableHead className="w-10">
                  {selectionMode && poolLeads.length > 0 && (
                    <>
                    <span>select all </span>
                    <SelectAllCheckbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={handleSelectAll}
                    />
                    </>
                  )}
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Assigned Agent</TableHead>
              {/* Action column — only in POOL tab */}
              {activeTab === "POOL" && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeTab === "POOL" ? 7 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {activeTab === "POOL"
                    ? "No leads in team pool. Waiting for L1 to distribute."
                    : "No leads assigned yet."}
                </TableCell>
              </TableRow>
            ) : (
              displayedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={
                    selectedLeadIds.includes(lead.id) ? "bg-blue-50" : ""
                  }
                >
                  {/* Checkbox cell — always present in POOL tab to keep column count stable.
                      In normal mode: empty cell.
                      In selection mode: shows the per-row checkbox. */}
                  {activeTab === "POOL" && (
                    <TableCell className="w-10">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLeadSelect(lead.id)}
                        />
                      )}
                    </TableCell>
                  )}

                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{priorityBadge(lead.priority)}</TableCell>
                  <TableCell>{stageBadge(lead.distributionStage)}</TableCell>
                  <TableCell>
                    {lead.assignedToUser ? (
                      <span className="text-sm">
                        {lead.assignedToUser.email.split("@")[0]}
                        <span className="text-muted-foreground ml-1">
                          ({lead.assignedToUser.designation})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Action cell — always present in POOL tab.
                      Normal mode  → "Distribute" button.
                      Selection mode → empty cell (actions moved to banner/header). */}
                  {activeTab === "POOL" && (
                    <TableCell>
                      {!selectionMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enterSelectionMode(lead.id)}
                        >
                          Distribute
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Assign to Agent Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Agent</DialogTitle>
            <DialogDescription>
              Assigning {selectedLeadIds.length} lead(s) — Team Pool → Agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Assignment Mode</label>
              <Select
                value={distMode}
                onValueChange={(v) => setDistMode(v as "MANUAL" | "AUTO")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual — pick an agent</SelectItem>
                  <SelectItem value="AUTO">
                    Auto — balanced by workload
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distMode === "MANUAL" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Agent</label>
                <Select value={distAgentId} onValueChange={setDistAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent…" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => {
                      const load = a._count?.assignedLeads ?? 0;
                      const limit = a.activeTicketLimit ?? 1;
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {a.email.split("@")[0]} — {load}/{limit} leads
                          {!a.isActive && " (inactive)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={distribute} disabled={distLoading}>
              {distLoading ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
