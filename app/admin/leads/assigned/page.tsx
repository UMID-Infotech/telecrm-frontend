// teleCRM/app/admin/leads/assigned/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
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
  priority: "HIGH" | "MEDIUM" | "LOW";
  distributionStage: "L1_POOL" | "L2_POOL" | "AGENT_OWNED" | null;
  assignedToUserId?: string;
  assignedToUser?: { id: string; email: string; designation: string };
  manager?: { id: string; email: string; designation: string };
  team?: { id: string; name: string };
  department?: { id: string; name: string };
  createdByUser?: { id: string; email: string; designation: string };
  updatedAt: string;
}

interface OrgAgent {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  teamId: string | null;
  departmentId: string | null;
  team: {
    id: string;
    name: string;
    managerId: string;
    manager: { id: string; email: string; designation: string };
    department: { id: string; name: string } | null;
  } | null;
  department: { id: string; name: string } | null;
  _count: { assignedLeads: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const priorityBadge = (p: Lead["priority"]) => {
  const cls: Record<Lead["priority"], string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    LOW: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls[p]}`}>
      {p}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminAssignedLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orgAgents, setOrgAgents] = useState<OrgAgent[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");

  // Re-assign modal
  const [reAssignDialog, setReAssignDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<OrgAgent | null>(null);
  const [reAssignLoading, setReAssignLoading] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, agentsRes] = await Promise.all([
        api.get("/leads/assigned"),
        api.get("/leads/distribution/org-agents"),
      ]);
      setLeads(leadsRes.data?.data ?? leadsRes.data ?? []);
      setOrgAgents(agentsRes.data?.data ?? agentsRes.data ?? []);
    } catch {
      showToast("Failed to load data", "destructive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived filter data ──────────────────────────────────────────────────
  const uniqueTeams = Array.from(
    new Map(
      leads
        .filter((l) => l.team)
        .map((l) => [l.team!.id, l.team!]),
    ).values(),
  );

  const filteredLeads = leads.filter((lead) => {
    const matchSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.assignedToUser?.email.toLowerCase().includes(search.toLowerCase());

    const matchPriority =
      filterPriority === "ALL" || lead.priority === filterPriority;

    const matchTeam =
      filterTeam === "ALL" || lead.team?.id === filterTeam;

    return matchSearch && matchPriority && matchTeam;
  });

  // ── Open re-assign modal ─────────────────────────────────────────────────
  const openReAssign = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedAgentId(lead.assignedToUserId ?? "");
    setSelectedAgentInfo(
      orgAgents.find((a) => a.id === lead.assignedToUserId) ?? null,
    );
    setReAssignDialog(true);
  };

  const closeReAssign = () => {
    setReAssignDialog(false);
    setSelectedLead(null);
    setSelectedAgentId("");
    setSelectedAgentInfo(null);
  };

  // When agent is selected in dropdown, show their context card
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setSelectedAgentInfo(orgAgents.find((a) => a.id === agentId) ?? null);
  };

  // ── Submit re-assign ─────────────────────────────────────────────────────
  const submitReAssign = async () => {
    if (!selectedLead || !selectedAgentId) return;
    if (selectedAgentId === selectedLead.assignedToUserId) {
      showToast("Lead is already assigned to this agent", "destructive");
      return;
    }
    setReAssignLoading(true);
    try {
      await api.patch("/leads/reassign", {
        leadId: selectedLead.id,
        agentId: selectedAgentId,
      });
      showToast(`Lead re-assigned to ${selectedAgentInfo?.email.split("@")[0]}`, "success");
      closeReAssign();
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Re-assign failed", "destructive");
    } finally {
      setReAssignLoading(false);
    }
  };

  // ── Group agents by team for the dropdown ────────────────────────────────
  const agentsByTeam = orgAgents.reduce<Record<string, OrgAgent[]>>((acc, agent) => {
    const key = agent.team?.name ?? "No Team";
    if (!acc[key]) acc[key] = [];
    acc[key].push(agent);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {ToastComponent}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Assigned Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All agent-owned leads across your organization — re-assign to any active agent.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Assigned", count: leads.length, cls: "bg-blue-50" },
          {
            label: "High Priority",
            count: leads.filter((l) => l.priority === "HIGH").length,
            cls: "bg-red-50",
          },
          {
            label: "Teams Covered",
            count: uniqueTeams.length,
            cls: "bg-purple-50",
          },
          {
            label: "Active Agents",
            count: orgAgents.filter((a) => a.isActive).length,
            cls: "bg-green-50",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by name, phone, or agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {uniqueTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || filterPriority !== "ALL" || filterTeam !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterPriority("ALL");
              setFilterTeam("ALL");
            }}
          >
            Clear filters
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredLeads.length} of {leads.length} leads
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {leads.length === 0
                      ? "No assigned leads found in your organization."
                      : "No leads match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.phone}</TableCell>
                    <TableCell>{priorityBadge(lead.priority)}</TableCell>
                    <TableCell>
                      {lead.assignedToUser ? (
                        <div>
                          <p className="text-sm font-medium">
                            {lead.assignedToUser.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.assignedToUser.designation}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.manager ? (
                        <div>
                          <p className="text-sm font-medium">
                            {lead.manager.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.manager.designation}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.team?.name ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.department?.name ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReAssign(lead)}
                      >
                        Re-assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Re-assign Modal ──────────────────────────────────────────────── */}
      <Dialog open={reAssignDialog} onOpenChange={(open) => !open && closeReAssign()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Re-assign Lead</DialogTitle>
            <DialogDescription>
              {selectedLead && (
                <>
                  Reassigning <strong>{selectedLead.name}</strong> (
                  {selectedLead.phone})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current assignment card */}
            {selectedLead?.assignedToUser && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1 text-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Currently Assigned To
                </p>
                <p className="font-semibold">
                  {selectedLead.assignedToUser.email.split("@")[0]}
                </p>
                <p className="text-muted-foreground">
                  {selectedLead.assignedToUser.designation}
                </p>
                {selectedLead.manager && (
                  <p className="text-muted-foreground text-xs">
                    Manager: {selectedLead.manager.email.split("@")[0]}
                    {selectedLead.team && ` · ${selectedLead.team.name}`}
                    {selectedLead.department && ` · ${selectedLead.department.name}`}
                  </p>
                )}
              </div>
            )}

            {/* Agent dropdown — grouped by team */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Select New Agent
                <span className="text-muted-foreground font-normal ml-1">
                  (any active agent in your organization)
                </span>
              </label>
              <Select value={selectedAgentId} onValueChange={handleAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(agentsByTeam).map(([teamName, teamAgents]) => (
                    <div key={teamName}>
                      {/* Team group header */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 sticky top-0">
                        {teamName}
                      </div>
                      {teamAgents.map((a) => {
                        const load = a._count?.assignedLeads ?? 0;
                        const limit = a.activeTicketLimit ?? 1;
                        const isCurrent = a.id === selectedLead?.assignedToUserId;
                        return (
                          <SelectItem
                            key={a.id}
                            value={a.id}
                            disabled={!a.isActive}
                          >
                            <span className="flex items-center gap-2">
                              <span>
                                {a.email.split("@")[0]}
                                {isCurrent && (
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    (current)
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {load}/{limit} leads
                              </span>
                              {!a.isActive && (
                                <span className="text-red-500 text-xs">(inactive)</span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected agent context card */}
            {selectedAgentInfo && selectedAgentInfo.id !== selectedLead?.assignedToUserId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 space-y-2 text-sm">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  New Assignment Details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Agent</p>
                    <p className="font-semibold">
                      {selectedAgentInfo.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAgentInfo.designation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Load</p>
                    <p className="font-semibold">
                      {selectedAgentInfo._count.assignedLeads} /{" "}
                      {selectedAgentInfo.activeTicketLimit} leads
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAgentInfo._count.assignedLeads >=
                      selectedAgentInfo.activeTicketLimit
                        ? "⚠ At capacity"
                        : "Available"}
                    </p>
                  </div>
                  {selectedAgentInfo.team?.manager && (
                    <div>
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="font-semibold">
                        {selectedAgentInfo.team.manager.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAgentInfo.team.manager.designation}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Team · Branch</p>
                    <p className="font-semibold">
                      {selectedAgentInfo.team?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAgentInfo.team?.department?.name ??
                        selectedAgentInfo.department?.name ??
                        "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeReAssign}>
              Cancel
            </Button>
            <Button
              onClick={submitReAssign}
              disabled={
                reAssignLoading ||
                !selectedAgentId ||
                selectedAgentId === selectedLead?.assignedToUserId
              }
            >
              {reAssignLoading ? "Saving…" : "Confirm Re-assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}