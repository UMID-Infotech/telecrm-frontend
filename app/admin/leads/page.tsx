// teleCRM/app/admin/leads/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ChevronDown, ChevronUp, Filter as FilterIcon, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  phone: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  distributionStage: "L1_POOL" | "L2_POOL" | "AGENT_OWNED" | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  teamId?: string;
  team?: { id: string; name: string };
  createdByUser?: { email: string };
  createdByRole: string;
  createdAt?: string;
  data?: Record<string, any>;
}

interface Team {
  id: string;
  name: string;
  manager: { email: string; designation: string };
  department?: { name: string };
  _count: { members: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDateTime = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const getField = (lead: Lead, ...keys: string[]) => {
  for (const k of keys) {
    const v = lead?.data?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

// Detail columns shown inline in the table (used both for table columns and filters)
type DetailCol = {
  key: string;
  label: string;
  get: (lead: Lead) => string | undefined;
};

const DETAIL_COLUMNS: DetailCol[] = [
  { key: "name", label: "Name", get: (l) => l?.name },
  { key: "phone", label: "Phone", get: (l) => l?.phone },
  {
    key: "email",
    label: "Email",
    get: (l) => getField(l, "email", "Contact Email") as string | undefined,
  },
  {
    key: "city",
    label: "City / State",
    get: (l) => getField(l, "city", "City / Location") as string | undefined,
  },
  {
    key: "businessName",
    label: "Business Name",
    get: (l) =>
      getField(l, "businessName", "Business Name") as string | undefined,
  },
  {
    key: "industry",
    label: "Industry / Sector",
    get: (l) =>
      getField(l, "industry", "Industry / Sector") as string | undefined,
  },
  {
    key: "websiteAvailable",
    label: "Website (Y/N)",
    get: (l) =>
      getField(l, "websiteAvailable", "Website (Y/N)") as string | undefined,
  },
  {
    key: "websiteLink",
    label: "Website Link",
    get: (l) =>
      getField(l, "websiteLink", "Website Link") as string | undefined,
  },
  {
    key: "socialMedia",
    label: "Social Media",
    get: (l) =>
      getField(l, "socialMedia", "Social Media") as string | undefined,
  },
  {
    key: "qualityOfOnlinePresence",
    label: "Quality of Online Presence",
    get: (l) =>
      getField(l, "qualityOfOnlinePresence", "Quality of Online Presence") as
        | string
        | undefined,
  },
  {
    key: "contactNumber",
    label: "Contact Number",
    get: (l) =>
      getField(l, "contactNumber", "Contact Number") as string | undefined,
  },
  {
    key: "profileLink",
    label: "Profile Link",
    get: (l) =>
      getField(l, "profileLink", "Profile Link (Link of Social Media Page)") as
        | string
        | undefined,
  },
  {
    key: "contactEmail",
    label: "Contact Email",
    get: (l) =>
      getField(l, "contactEmail", "Contact Email") as string | undefined,
  },
  {
    key: "needIdentified",
    label: "Need Identified",
    get: (l) =>
      getField(l, "needIdentified", "Need Identified") as string | undefined,
  },
  {
    key: "sourceOfLead",
    label: "Source of Lead",
    get: (l) =>
      getField(l, "sourceOfLead", "Source of Lead") as string | undefined,
  },
  {
    key: "priorityLevel",
    label: "Priority Level",
    get: (l) =>
      getField(l, "priorityLevel", "Priority Level") as string | undefined,
  },
  {
    key: "outreachStatus",
    label: "Outreach Status",
    get: (l) =>
      getField(l, "outreachStatus", "Outreach Status") as string | undefined,
  },
  {
    key: "nextFollowUpDate",
    label: "Next Follow-Up Date",
    get: (l) =>
      getField(l, "nextFollowUpDate", "Next Follow-Up Date") as
        | string
        | undefined,
  },
  {
    key: "notes",
    label: "Notes",
    get: (l) => getField(l, "notes", "Notes") as string | undefined,
  },
  {
    key: "additionalComments",
    label: "Additional Comments",
    get: (l) =>
      getField(l, "additionalComments", "Additional Comments") as
        | string
        | undefined,
  },
  {
    key: "sourceLink",
    label: "Source Link",
    get: (l) => getField(l, "sourceLink", "Source Link") as string | undefined,
  },
  { key: "priority", label: "Priority", get: (l) => l?.priority },
  {
    key: "approvalStatus",
    label: "Approval Status",
    get: (l) => l?.approvalStatus,
  },
  {
    key: "distributionStage",
    label: "Stage",
    get: (l) => l?.distributionStage ?? undefined,
  },
  {
    key: "createdBy",
    label: "Created By",
    get: (l) => l?.createdByUser?.email,
  },
  {
    key: "createdByRole",
    label: "Created By Role",
    get: (l) => l?.createdByRole,
  },
  { key: "team", label: "Team", get: (l) => l?.team?.name },
  {
    key: "createdAt",
    label: "Created",
    get: (l) => (l?.createdAt ? formatDateTime(l.createdAt) : undefined),
  },
];

// ─── Badges ──────────────────────────────────────────────────────────────────
const approvalBadge = (status: Lead["approvalStatus"]) => {
  const map: Record<
    Lead["approvalStatus"],
    "default" | "destructive" | "secondary"
  > = {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
};

const stageBadge = (stage: Lead["distributionStage"]) => {
  if (!stage) return <span className="text-muted-foreground">—</span>;
  const map: Record<NonNullable<Lead["distributionStage"]>, string> = {
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
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[stage]}`}>
      {labels[stage]}
    </span>
  );
};

const priorityBadge = (p: Lead["priority"]) => {
  const map: Record<Lead["priority"], string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    LOW: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[p]}`}>
      {p}
    </span>
  );
};

const renderCell = (lead: Lead, key: string) => {
  switch (key) {
    case "priority":
      return priorityBadge(lead.priority);
    case "approvalStatus":
      return approvalBadge(lead.approvalStatus);
    case "distributionStage":
      return stageBadge(lead.distributionStage);
    case "createdBy":
      return lead.createdByUser?.email ?? "—";
    default: {
      const col = DETAIL_COLUMNS.find((c) => c.key === key);
      const v = col?.get(lead);
      return v !== undefined && v !== null && v !== "" ? String(v) : "—";
    }
  }
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Per-column filter combobox ───────────────────────────────────────────────
function ColumnFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [value, options]);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          value={value}
          placeholder={`Filter ${label.toLowerCase()}…`}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pr-7"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover shadow-md">
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "L1_POOL">(
    "ALL",
  );

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    leadId: string;
  }>({ open: false, leadId: "" });
  const [rejectReason, setRejectReason] = useState("");

  const [distDialog, setDistDialog] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [distMode, setDistMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [distTeamId, setDistTeamId] = useState("");
  const [distLoading, setDistLoading] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, teamsRes] = await Promise.all([
        api.get("/leads"),
        api.get("/leads/distribution/teams"),
      ]);
      setLeads(leadsRes.data?.data ?? leadsRes.data ?? []);
      setTeams(teamsRes.data?.data ?? teamsRes.data ?? []);
    } catch {
      showToast("Failed to load data", "destructive");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const optionsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of DETAIL_COLUMNS) {
      const set = new Set<string>();
      for (const l of leads) {
        const v = col.get(l);
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          set.add(String(v));
        }
      }
      map[col.key] = Array.from(set).sort();
    }
    return map;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (activeTab === "PENDING" && l.approvalStatus !== "PENDING")
        return false;
      if (activeTab === "L1_POOL" && l.distributionStage !== "L1_POOL")
        return false;

      for (const col of DETAIL_COLUMNS) {
        const q = (filters[col.key] ?? "").trim().toLowerCase();
        if (!q) continue;
        const v = col.get(l);
        if (v === undefined || v === null) return false;
        if (!String(v).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, activeTab, filters]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const displayedLeads = filteredLeads.slice(pageStart, pageStart + pageSize);

  const selectableLeadIds = useMemo(
    () =>
      displayedLeads
        .filter((l) => l.distributionStage === "L1_POOL")
        .map((l) => l.id),
    [displayedLeads],
  );

  const allSelected =
    selectableLeadIds.length > 0 &&
    selectableLeadIds.every((id) => selectedLeadIds.includes(id));
  const someSelected =
    !allSelected &&
    selectableLeadIds.some((id) => selectedLeadIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds((prev) =>
        prev.filter((id) => !selectableLeadIds.includes(id)),
      );
    } else {
      setSelectedLeadIds((prev) =>
        Array.from(new Set([...prev, ...selectableLeadIds])),
      );
    }
  };

  const toggleLeadSelect = (id: string) =>
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const approveLead = async (leadId: string) => {
    try {
      await api.patch(`/leads/${leadId}/approve`, { status: "APPROVED" });
      showToast("Lead approved and moved to L1 Pool", "success");
      fetchData();
    } catch {
      showToast("Approval failed", "destructive");
    }
  };

  const confirmReject = async () => {
    try {
      await api.patch(`/leads/${rejectDialog.leadId}/approve`, {
        status: "REJECTED",
        rejectionReason: rejectReason,
      });
      showToast("Lead rejected", "default");
      setRejectDialog({ open: false, leadId: "" });
      setRejectReason("");
      fetchData();
    } catch {
      showToast("Rejection failed", "destructive");
    }
  };

  const openDistDialog = () => {
    if (selectedLeadIds.length === 0) {
      showToast(
        "Select at least one lead from L1 Pool to distribute",
        "destructive",
      );
      return;
    }
    setDistDialog(true);
  };

  const distribute = async () => {
    if (distMode === "MANUAL" && !distTeamId) {
      showToast("Select a team for manual distribution", "destructive");
      return;
    }
    setDistLoading(true);
    try {
      const payload: any = { leadIds: selectedLeadIds, mode: distMode };
      if (distMode === "MANUAL") payload.teamId = distTeamId;
      await api.post("/leads/distribute/team", payload);
      showToast(
        `${selectedLeadIds.length} lead(s) distributed to team`,
        "success",
      );
      setDistDialog(false);
      setSelectedLeadIds([]);
      setDistTeamId("");
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

  const l1PoolLeads = leads.filter((l) => l.distributionStage === "L1_POOL");

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && v.trim() !== "",
  ).length;
  const resetFilters = () => setFilters({});

  const canDistributeRow = (l: Lead) => l.distributionStage === "L1_POOL";

  const totalCols =
    (activeTab === "L1_POOL" ? 1 : 0) + DETAIL_COLUMNS.length + 1;

  return (
    // ↓ overflow-x-hidden on the page root prevents any accidental page-level scroll
    <div className="p-3 sm:p-6 space-y-4 overflow-x-hidden w-full">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Leads Management</h1>
          <p className="text-sm text-muted-foreground">
            Approve leads and distribute them to teams (L1 → L2 pipeline)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => (window.location.href = "/admin/leads/create")}
          >
            + New Lead
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <FilterIcon className="h-4 w-4 mr-1" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                {activeFilterCount}
              </span>
            )}
            {filterOpen ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          {selectedLeadIds.length > 0 && (
            <Button size="sm" onClick={openDistDialog}>
              Distribute ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", count: leads.length, cls: "bg-slate-50" },
          {
            label: "Pending Approval",
            count: leads.filter((l) => l.approvalStatus === "PENDING").length,
            cls: "bg-yellow-50",
          },
          {
            label: "L1 Pool (Ready)",
            count: l1PoolLeads.length,
            cls: "bg-blue-50",
          },
          {
            label: "Distributed",
            count: leads.filter(
              (l) =>
                l.distributionStage === "L2_POOL" ||
                l.distributionStage === "AGENT_OWNED",
            ).length,
            cls: "bg-green-50",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-3 ${s.cls}`}>
            <div className="text-xl sm:text-2xl font-bold">{s.count}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs — horizontally scrollable on mobile so they don't wrap awkwardly */}
      <div className="border-b overflow-x-auto">
        <div className="flex min-w-max">
          {(["ALL", "PENDING", "L1_POOL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "ALL"
                ? "All Leads"
                : tab === "PENDING"
                  ? "Needs Approval"
                  : "L1 Pool (Distributable)"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter accordion */}
      {filterOpen && (
        <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Filter by any column</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {DETAIL_COLUMNS.map((col) => (
              <ColumnFilter
                key={col.key}
                label={col.label}
                value={filters[col.key] ?? ""}
                options={optionsByKey[col.key] ?? []}
                onChange={(v) =>
                  setFilters((prev) => ({ ...prev, [col.key]: v }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Distribute banner */}
      {activeTab === "L1_POOL" && l1PoolLeads.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-blue-50 px-3 py-2">
          <div className="text-sm text-blue-900">
            ✓ Select leads below and click <b>Distribute</b> to assign them to
            teams
          </div>
          {selectedLeadIds.length > 0 && (
            <Button size="sm" onClick={openDistDialog}>
              Distribute Selected ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      )}

      {/* Table card — full width; scroll is confined inside this card */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading leads…
        </div>
      ) : (
        <div className="rounded-lg border bg-card w-full">
          {/*
            ── KEY FIX ──────────────────────────────────────────────────────────
            The overflow-x-auto is scoped to this inner div only.
            The outer card and the rest of the page are NOT inside this div,
            so they never contribute to horizontal scrolling.
            ─────────────────────────────────────────────────────────────────────
          */}
          <div className="overflow-hidden">
            {/* Header */}
            <div className="border-b bg-muted/30">
              <div
                className="grid min-w-max"
                style={{
                  gridTemplateColumns: `${
                    activeTab === "L1_POOL" ? "50px " : ""
                  }repeat(${DETAIL_COLUMNS.length}, minmax(180px, 180px)) 140px`,
                }}
              >
                {activeTab === "L1_POOL" && (
                  <div className="p-3 border-r flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                    />
                  </div>
                )}

                {DETAIL_COLUMNS.map((col) => (
                  <div
                    key={col.key}
                    className="p-3 text-sm font-semibold border-r whitespace-nowrap"
                  >
                    {col.label}
                  </div>
                ))}

                <div className="p-3 text-sm font-semibold whitespace-nowrap">
                  Actions
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {displayedLeads.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  No leads found
                </div>
              ) : (
                displayedLeads.map((lead) => (
                  <div key={lead.id} className="overflow-x-auto">
                    <div
                      className="grid min-w-max"
                      style={{
                        gridTemplateColumns: `${
                          activeTab === "L1_POOL" ? "50px " : ""
                        }repeat(${DETAIL_COLUMNS.length}, minmax(180px, 180px)) 140px`,
                      }}
                    >
                      {activeTab === "L1_POOL" && (
                        <div className="p-3 border-r flex items-center">
                          {lead.distributionStage === "L1_POOL" && (
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelect(lead.id)}
                            />
                          )}
                        </div>
                      )}

                      {DETAIL_COLUMNS.map((col) => (
                        <div
                          key={col.key}
                          className="p-3 border-r whitespace-nowrap text-sm"
                        >
                          {renderCell(lead, col.key)}
                        </div>
                      ))}

                      <div className="p-3">
                        <Button
                          size="sm"
                          disabled={!canDistributeRow(lead)}
                          onClick={() => {
                            setSelectedLeadIds([lead.id]);
                            setActiveTab("L1_POOL");
                            setDistDialog(true);
                          }}
                        >
                          Distribute
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination — outside the scroll div, always full width */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <b>
                {filteredLeads.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, filteredLeads.length)}
              </b>{" "}
              of {filteredLeads.length}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Rows per page
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
              >
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </Button>
              <span className="text-sm whitespace-nowrap">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                »
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(o) =>
          setRejectDialog({ open: o, leadId: rejectDialog.leadId })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Lead</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason…"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, leadId: "" })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribute to Team</DialogTitle>
            <DialogDescription>
              Distributing {selectedLeadIds.length} lead(s) — L1 Pool → Team
              Pool
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Distribution Mode</label>
              <Select
                value={distMode}
                onValueChange={(v) => setDistMode(v as "MANUAL" | "AUTO")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual — pick a team</SelectItem>
                  <SelectItem value="AUTO">
                    Auto — round-robin by priority
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distMode === "MANUAL" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Team</label>
                <Select value={distTeamId} onValueChange={setDistTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.manager?.email?.split("@")[0]} (
                        {t._count?.members} members)
                      </SelectItem>
                    ))}
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
              {distLoading ? "Distributing…" : "Distribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
