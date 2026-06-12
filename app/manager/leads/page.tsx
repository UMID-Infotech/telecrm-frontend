// teleCRM/app/manager/leads/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

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
  createdAt?: string;
  data?: Record<string, any>;
}

interface Agent {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  _count: { assignedLeads: number };
}

const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const getField = (lead: Lead, ...keys: string[]) => {
  for (const k of keys) {
    const v = lead?.data?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const priorityBadge = (p: Lead["priority"]) => {
  const cls: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    LOW: "bg-gray-100 text-gray-600",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls[p]}`}>{p}</span>;
};

const stageBadge = (stage: Lead["distributionStage"]) => {
  if (!stage) return null;
  const cls: Record<NonNullable<Lead["distributionStage"]>, string> = {
    L1_POOL: "bg-yellow-100 text-yellow-800",
    L2_POOL: "bg-blue-100 text-blue-800",
    AGENT_OWNED: "bg-green-100 text-green-800",
  };
  const labels: Record<NonNullable<Lead["distributionStage"]>, string> = {
    L1_POOL: "L1 Pool", L2_POOL: "Team Pool", AGENT_OWNED: "Assigned",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls[stage]}`}>{labels[stage]}</span>;
};

function SelectAllCheckbox({
  checked, indeterminate, onChange,
}: { checked: boolean; indeterminate: boolean; onChange: (checked: boolean) => void; }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  );
}

const PAGE_SIZE = 10;

type FilterDef = {
  key: string;
  label: string;
  extract: (l: Lead) => any;
};

const FILTER_DEFS: FilterDef[] = [
  { key: "name",        label: "Name",                       extract: (l) => l.name },
  { key: "phone",       label: "Phone",                      extract: (l) => l.phone },
  { key: "email",       label: "Email",                      extract: (l) => l?.data?.email || l?.data?.["Contact Email"] },
  { key: "city",        label: "City / State",               extract: (l) => getField(l, "city", "City / Location") },
  { key: "industry",    label: "Industry / Sector",          extract: (l) => getField(l, "industry", "Industry / Sector") },
  { key: "websiteYN",   label: "Website (Y/N)",              extract: (l) => getField(l, "websiteAvailable", "Website (Y/N)") },
  { key: "websiteLink", label: "Website Link",               extract: (l) => getField(l, "websiteLink", "Website Link") },
  { key: "social",      label: "Social Media",               extract: (l) => getField(l, "socialMedia", "Social Media") },
  { key: "quality",     label: "Quality of Online Presence", extract: (l) => getField(l, "qualityOfOnlinePresence", "Quality of Online Presence") },
  { key: "contactNum",  label: "Contact Number",             extract: (l) => getField(l, "contactNumber", "Contact Number") },
  { key: "profileLink", label: "Profile Link",               extract: (l) => getField(l, "profileLink", "Profile Link (Link of Social Media Page)") },
  { key: "contactEmail",label: "Contact Email",              extract: (l) => getField(l, "contactEmail", "Contact Email") },
  { key: "need",        label: "Need Identified",            extract: (l) => getField(l, "needIdentified", "Need Identified") },
  { key: "source",      label: "Source of Lead",             extract: (l) => getField(l, "sourceOfLead", "Source of Lead") },
  { key: "priorityLvl", label: "Priority Level",             extract: (l) => getField(l, "priorityLevel", "Priority Level") || l.priority },
  { key: "outreach",    label: "Outreach Status",            extract: (l) => getField(l, "outreachStatus", "Outreach Status") },
  { key: "followUp",    label: "Next Follow-Up Date",        extract: (l) => getField(l, "nextFollowUpDate", "Next Follow-Up Date") },
  { key: "notes",       label: "Notes",                      extract: (l) => getField(l, "notes", "Notes") },
  { key: "comments",    label: "Additional Comments",        extract: (l) => getField(l, "additionalComments", "Additional Comments") },
  { key: "sourceLink",  label: "Source Link",                extract: (l) => getField(l, "sourceLink", "Source Link") },
  { key: "assigned",    label: "Assigned Agent",             extract: (l) => l.assignedToUser?.email?.split("@")[0] },
  { key: "stage",       label: "Stage",                      extract: (l) => l.distributionStage },
];

function FieldFilter({
  def, value, onChange, options,
}: {
  def: FilterDef;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const filteredOptions = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;

  return (
    <div ref={wrapRef} className="space-y-1 min-w-0">
      <label className="text-xs font-medium text-muted-foreground truncate block">
        {def.label}
      </label>
      <div className="relative">
        <Input
          value={value}
          placeholder={`Filter ${def.label.toLowerCase()}…`}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pr-7 h-9 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
        {open && filteredOptions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow-lg">
            {filteredOptions.slice(0, 100).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 truncate"
              >
                {opt}
              </button>
            ))}
            {filteredOptions.length > 100 && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground border-t">
                {filteredOptions.length - 100} more… keep typing to narrow
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManagerLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"POOL" | "ASSIGNED">("POOL");

  const [selectionMode, setSelectionMode] = useState(false);
  const [distDialog, setDistDialog] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [distMode, setDistMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [distAgentId, setDistAgentId] = useState("");
  const [distLoading, setDistLoading] = useState(false);

  const [reAssignDialog, setReAssignDialog] = useState(false);
  const [reAssignLead, setReAssignLead] = useState<Lead | null>(null);
  const [reAssignAgentId, setReAssignAgentId] = useState("");
  const [reAssignLoading, setReAssignLoading] = useState(false);

  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const poolLeads = leads.filter((l) => l.distributionStage === "L2_POOL");
  const assignedLeads = leads.filter((l) => l.distributionStage === "AGENT_OWNED");
  const baseLeads = activeTab === "POOL" ? poolLeads : assignedLeads;

  const optionsByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const def of FILTER_DEFS) {
      const set = new Set<string>();
      for (const l of baseLeads) {
        const v = def.extract(l);
        if (v !== undefined && v !== null && v !== "") set.add(String(v));
      }
      map[def.key] = Array.from(set).sort();
    }
    return map;
  }, [baseLeads]);

  const filteredLeads = useMemo(() => {
    const active = FILTER_DEFS
      .map((d) => ({ d, q: (filterValues[d.key] ?? "").trim().toLowerCase() }))
      .filter((x) => x.q.length > 0);

    if (active.length === 0) return baseLeads;

    return baseLeads.filter((l) =>
      active.every(({ d, q }) => {
        const v = d.extract(l);
        if (v === undefined || v === null || v === "") return false;
        return String(v).toLowerCase().includes(q);
      })
    );
  }, [baseLeads, filterValues]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { setPage(1); }, [activeTab, filterValues]);

  const displayedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pagePoolIds = displayedLeads.map((l) => l.id);
  const isAllSelected =
    pagePoolIds.length > 0 && pagePoolIds.every((id) => selectedLeadIds.includes(id));
  const isSomeSelected =
    !isAllSelected && pagePoolIds.some((id) => selectedLeadIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...pagePoolIds])));
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => !pagePoolIds.includes(id)));
    }
  };

  const toggleLeadSelect = (id: string) =>
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const enterSelectionMode = (leadId: string) => {
    setSelectedLeadIds([leadId]);
    setSelectionMode(true);
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedLeadIds([]);
  };

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
      showToast(`${selectedLeadIds.length} lead(s) assigned to agent`, "success");
      setDistDialog(false);
      setSelectedLeadIds([]);
      setDistAgentId("");
      setSelectionMode(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Distribution failed", "destructive");
    } finally {
      setDistLoading(false);
    }
  };

  const openReAssignDialog = (lead: Lead) => {
    setReAssignLead(lead);
    setReAssignAgentId(lead.assignedToUserId ?? "");
    setReAssignDialog(true);
  };

  const submitReAssign = async () => {
    if (!reAssignLead) return;
    if (!reAssignAgentId) {
      showToast("Select an agent to re-assign this lead", "destructive");
      return;
    }
    if (reAssignAgentId === reAssignLead.assignedToUserId) {
      showToast("Lead is already assigned to this agent", "destructive");
      return;
    }
    setReAssignLoading(true);
    try {
      await api.patch("/leads/reassign", {
        leadId: reAssignLead.id,
        agentId: reAssignAgentId,
      });
      showToast("Lead re-assigned successfully", "success");
      setReAssignDialog(false);
      setReAssignLead(null);
      setReAssignAgentId("");
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Re-assign failed", "destructive");
    } finally {
      setReAssignLoading(false);
    }
  };

  const activeAgents = agents.filter((a) => a.isActive);

  const buildDetailRows = (lead: Lead) => [
    { label: "Name", value: lead?.name },
    { label: "Email", value: lead?.data?.email || lead?.data?.["Contact Email"] },
    { label: "City / State", value: lead?.data?.city || lead?.data?.["City / Location"] },
    { label: "Industry / Sector", value: lead?.data?.industry || lead?.data?.["Industry / Sector"] },
    { label: "Website (Y/N)", value: lead?.data?.websiteAvailable || lead?.data?.["Website (Y/N)"] },
    { label: "Website Link", value: lead?.data?.websiteLink || lead?.data?.["Website Link"] },
    { label: "Social Media", value: lead?.data?.socialMedia || lead?.data?.["Social Media"] },
    { label: "Quality of Online Presence", value: lead?.data?.qualityOfOnlinePresence || lead?.data?.["Quality of Online Presence"] },
    { label: "Contact Number", value: lead?.data?.contactNumber || lead?.data?.["Contact Number"] },
    { label: "Profile Link", value: lead?.data?.profileLink || lead?.data?.["Profile Link (Link of Social Media Page)"] },
    { label: "Contact Email", value: lead?.data?.contactEmail || lead?.data?.["Contact Email"] },
    { label: "Need Identified", value: lead?.data?.needIdentified || lead?.data?.["Need Identified"] },
    { label: "Source of Lead", value: lead?.data?.sourceOfLead || lead?.data?.["Source of Lead"] },
    { label: "Priority Level", value: lead?.data?.priorityLevel || lead?.data?.["Priority Level"] },
    { label: "Outreach Status", value: lead?.data?.outreachStatus || lead?.data?.["Outreach Status"] },
    { label: "Next Follow-Up Date", value: lead?.data?.nextFollowUpDate || lead?.data?.["Next Follow-Up Date"] },
    { label: "Notes", value: lead?.data?.notes || lead?.data?.["Notes"] },
    { label: "Additional Comments", value: lead?.data?.additionalComments || lead?.data?.["Additional Comments"] },
    { label: "Source Link", value: lead?.data?.sourceLink || lead?.data?.["Source Link"] },
    { label: "Created", value: formatDateTime(lead?.createdAt) },
  ];

  const activeFilterCount = Object.values(filterValues).filter((v) => v && v.trim()).length;

  const clearAllFilters = () => setFilterValues({});

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {ToastComponent}

      {/* Filter accordion */}
      <div className="border rounded-lg bg-white">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 sm:px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary text-white text-xs">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="shrink-0">{filtersOpen ? "▴" : "▾"}</span>
        </button>

        {filtersOpen && (
          <div className="border-t p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {FILTER_DEFS.map((def) => (
                <FieldFilter
                  key={def.key}
                  def={def}
                  value={filterValues[def.key] ?? ""}
                  options={optionsByField[def.key] ?? []}
                  onChange={(v) =>
                    setFilterValues((prev) => ({ ...prev, [def.key]: v }))
                  }
                />
              ))}
            </div>
            {activeFilterCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredLeads.length} of {baseLeads.length} leads
                </span>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Team Leads</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Distribute leads from your team pool to agents (L2 → L3 pipeline)
          </p>
        </div>

        {selectionMode && activeTab === "POOL" && (
          <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
            <Button variant="outline" onClick={cancelSelectionMode} className="whitespace-nowrap">
              Cancel
            </Button>
            <Button onClick={openDistDialog} className="whitespace-nowrap">
              Assign ({selectedLeadIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Team Pool", count: poolLeads.length, cls: "bg-blue-50" },
          { label: "Agent Assigned", count: assignedLeads.length, cls: "bg-green-50" },
          { label: "Total Agents", count: agents.length, cls: "bg-slate-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.cls} rounded-lg p-3 sm:p-4 min-w-0`}>
            <p className="text-xl sm:text-2xl font-bold">{s.count}</p>
            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agent workload */}
      {agents.length > 0 && (
        <div className="border rounded-lg p-3 sm:p-4 bg-white">
          <h2 className="text-sm font-semibold mb-3">Agent Workload</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((a) => {
              const load = a._count?.assignedLeads ?? 0;
              const limit = a.activeTicketLimit ?? 1;
              const pct = Math.min(100, Math.round((load / limit) * 100));
              return (
                <div key={a.id} className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate min-w-0">{a.email.split("@")[0]}</span>
                    <span className="shrink-0 text-muted-foreground">{load}/{limit}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-orange-400" : "bg-green-500"}`}
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
      <div className="border-b overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max">
          {[
            { key: "POOL" as const, label: `Team Pool (${poolLeads.length})` },
            { key: "ASSIGNED" as const, label: `Assigned (${assignedLeads.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== "POOL") cancelSelectionMode();
                else setSelectedLeadIds([]);
              }}
              className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection banner */}
      {activeTab === "POOL" && selectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs sm:text-sm text-blue-900 min-w-0">
            {selectedLeadIds.length} lead(s) selected — use the select-all checkbox to pick every lead on this page.
          </p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={cancelSelectionMode}>Cancel</Button>
            <Button size="sm" onClick={openDistDialog}>Assign ({selectedLeadIds.length})</Button>
          </div>
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === "POOL" && (
                    <TableHead className="w-10">
                      {selectionMode && displayedLeads.length > 0 && (
                        <SelectAllCheckbox
                          checked={isAllSelected}
                          indeterminate={isSomeSelected}
                          onChange={handleSelectAll}
                        />
                      )}
                    </TableHead>
                  )}
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      {activeTab === "POOL"
                        ? "No leads in team pool. Waiting for L1 to distribute."
                        : "No leads assigned yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      {activeTab === "POOL" && (
                        <TableCell>
                          {selectionMode && (
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelect(lead.id)}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{String(getField(lead, "city", "City / Location") ?? "—")}</TableCell>
                      <TableCell>{String(getField(lead, "industry", "Industry / Sector") ?? "—")}</TableCell>
                      <TableCell>{priorityBadge(lead.priority)}</TableCell>
                      <TableCell>{stageBadge(lead.distributionStage)}</TableCell>
                      <TableCell>
                        {lead.assignedToUser ? (
                          <div className="text-xs">
                            <div>{lead.assignedToUser.email.split("@")[0]}</div>
                            <div className="text-muted-foreground">({lead.assignedToUser.designation})</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailsLead(lead)}>View</Button>
                          {activeTab === "POOL" && !selectionMode && (
                            <Button size="sm" onClick={() => enterSelectionMode(lead.id)}>Distribute</Button>
                          )}
                          {activeTab === "ASSIGNED" && (
                            <Button size="sm" variant="outline" onClick={() => openReAssignDialog(lead)}>Re-assign</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {activeTab === "POOL" && selectionMode && displayedLeads.length > 0 && (
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-md text-xs">
                <SelectAllCheckbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={handleSelectAll}
                />
                <span>Select all on this page</span>
              </label>
            )}

            {displayedLeads.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8 border rounded-lg bg-white">
                {activeTab === "POOL"
                  ? "No leads in team pool. Waiting for L1 to distribute."
                  : "No leads assigned yet."}
              </div>
            ) : (
              displayedLeads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-3 bg-white space-y-2">
                  <div className="flex items-start gap-2">
                    {activeTab === "POOL" && selectionMode && (
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelect(lead.id)}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{lead.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{lead.phone}</div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {priorityBadge(lead.priority)}
                      {stageBadge(lead.distributionStage)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="text-muted-foreground">City</div>
                      <div className="truncate">{String(getField(lead, "city", "City / Location") ?? "—")}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-muted-foreground">Industry</div>
                      <div className="truncate">{String(getField(lead, "industry", "Industry / Sector") ?? "—")}</div>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <div className="text-muted-foreground">Assigned Agent</div>
                      <div className="truncate">
                        {lead.assignedToUser
                          ? `${lead.assignedToUser.email.split("@")[0]} (${lead.assignedToUser.designation})`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setDetailsLead(lead)}>View</Button>
                    {activeTab === "POOL" && !selectionMode && (
                      <Button size="sm" onClick={() => enterSelectionMode(lead.id)}>Distribute</Button>
                    )}
                    {activeTab === "ASSIGNED" && (
                      <Button size="sm" variant="outline" onClick={() => openReAssignDialog(lead)}>Re-assign</Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      {filteredLeads.length > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Page {safePage} of {totalPages} · {filteredLeads.length} leads
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!detailsLead} onOpenChange={(open) => !open && setDetailsLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Full information for {detailsLead?.name ?? "this lead"}
            </DialogDescription>
          </DialogHeader>

          {detailsLead && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {buildDetailRows(detailsLead).map((row) => {
                const val =
                  row.value === undefined || row.value === null || row.value === ""
                    ? "—" : String(row.value);
                const isLink = typeof row.value === "string" && /^https?:\/\//i.test(row.value);
                return (
                  <div key={row.label} className="min-w-0">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-sm break-words">
                      {isLink ? (
                        <a href={val} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                          {val}
                        </a>
                      ) : val}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsLead(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Assign to Agent</DialogTitle>
            <DialogDescription>
              Assigning {selectedLeadIds.length} lead(s) — Team Pool → Agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Mode</label>
              <Select value={distMode} onValueChange={(v) => setDistMode(v as "MANUAL" | "AUTO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual — pick an agent</SelectItem>
                  <SelectItem value="AUTO">Auto — balanced by workload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distMode === "MANUAL" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Agent</label>
                <Select value={distAgentId} onValueChange={setDistAgentId}>
                  <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => {
                      const load = a._count?.assignedLeads ?? 0;
                      const limit = a.activeTicketLimit ?? 1;
                      return (
                        <SelectItem key={a.id} value={a.id} disabled={!a.isActive}>
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDistDialog(false)}>Cancel</Button>
            <Button onClick={distribute} disabled={distLoading}>
              {distLoading ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-assign Dialog */}
      <Dialog
        open={reAssignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReAssignDialog(false);
            setReAssignLead(null);
            setReAssignAgentId("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Re-assign Lead</DialogTitle>
            <DialogDescription>
              {reAssignLead && (
                <>
                  Reassigning <strong>{reAssignLead.name}</strong> — currently assigned to{" "}
                  <strong>{reAssignLead.assignedToUser?.email.split("@")[0] ?? "—"}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reAssignLead?.assignedToUser && (
              <div className="bg-slate-50 border rounded-md p-3">
                <p className="text-xs text-muted-foreground">Currently Assigned</p>
                <p className="text-sm font-medium truncate">
                  {reAssignLead.assignedToUser.email.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {reAssignLead.assignedToUser.designation}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select New Agent{" "}
                <span className="text-xs text-muted-foreground">(your team only)</span>
              </label>
              <Select value={reAssignAgentId} onValueChange={setReAssignAgentId}>
                <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                <SelectContent>
                  {activeAgents.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No active agents in your team
                    </div>
                  ) : (
                    activeAgents.map((a) => {
                      const load = a._count?.assignedLeads ?? 0;
                      const limit = a.activeTicketLimit ?? 1;
                      const isCurrent = a.id === reAssignLead?.assignedToUserId;
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {a.email.split("@")[0]}
                          {isCurrent && " (current)"} — {load}/{limit} leads
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReAssignDialog(false);
                setReAssignLead(null);
                setReAssignAgentId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReAssign}
              disabled={
                reAssignLoading ||
                !reAssignAgentId ||
                reAssignAgentId === reAssignLead?.assignedToUserId
              }
            >
              {reAssignLoading ? "Saving…" : "Re-assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
