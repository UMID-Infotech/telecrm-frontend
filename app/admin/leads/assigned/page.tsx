// teleCRM/app/admin/leads/assigned/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { api } from "@/lib/api";

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
import {
  ChevronDown,
  ChevronUp,
  Filter as FilterIcon,
  X,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

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
  createdByRole?: string;
  createdAt?: string;
  updatedAt: string;
  data?: Record<string, any>;
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

/**
 * Returns true if the string looks like a URL.
 * Handles: http/https, bare www., and common TLD-only strings like "google.com/path".
 */
const isUrl = (v: string): boolean => {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return true;
  if (/^www\./i.test(s)) return true;
  // bare domain-like string with a path or at least a dot-tld: e.g. "google.com" or "fb.com/page"
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(s)) return true;
  return false;
};

/** Ensure the URL has a protocol so <a href> works correctly. */
const toHref = (v: string): string => {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};

// ─── Detail columns ───────────────────────────────────────────────────────────
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
    key: "assignedAgent",
    label: "Assigned Agent",
    get: (l) => l?.assignedToUser?.email,
  },
  { key: "manager", label: "Manager", get: (l) => l?.manager?.email },
  { key: "team", label: "Team", get: (l) => l?.team?.name },
  { key: "department", label: "Department", get: (l) => l?.department?.name },
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
  {
    key: "createdAt",
    label: "Created",
    get: (l) => (l?.createdAt ? formatDateTime(l.createdAt) : undefined),
  },
];

// ─── Build detail rows for accordion ─────────────────────────────────────────
const buildDetailRows = (lead: Lead) => [
  { label: "Name", value: lead?.name },
  { label: "Phone", value: lead?.phone },
  { label: "Email", value: getField(lead, "email", "Contact Email") },
  { label: "City / State", value: getField(lead, "city", "City / Location") },
  {
    label: "Business Name",
    value: getField(lead, "businessName", "Business Name"),
  },
  {
    label: "Industry / Sector",
    value: getField(lead, "industry", "Industry / Sector"),
  },
  {
    label: "Website (Y/N)",
    value: getField(lead, "websiteAvailable", "Website (Y/N)"),
  },
  {
    label: "Website Link",
    value: getField(lead, "websiteLink", "Website Link"),
  },
  {
    label: "Social Media",
    value: getField(lead, "socialMedia", "Social Media"),
  },
  {
    label: "Quality of Online Presence",
    value: getField(
      lead,
      "qualityOfOnlinePresence",
      "Quality of Online Presence",
    ),
  },
  {
    label: "Contact Number",
    value: getField(lead, "contactNumber", "Contact Number"),
  },
  {
    label: "Profile Link",
    value: getField(
      lead,
      "profileLink",
      "Profile Link (Link of Social Media Page)",
    ),
  },
  {
    label: "Contact Email",
    value: getField(lead, "contactEmail", "Contact Email"),
  },
  {
    label: "Need Identified",
    value: getField(lead, "needIdentified", "Need Identified"),
  },
  {
    label: "Source of Lead",
    value: getField(lead, "sourceOfLead", "Source of Lead"),
  },
  {
    label: "Priority Level",
    value: getField(lead, "priorityLevel", "Priority Level"),
  },
  {
    label: "Outreach Status",
    value: getField(lead, "outreachStatus", "Outreach Status"),
  },
  {
    label: "Next Follow-Up Date",
    value: getField(lead, "nextFollowUpDate", "Next Follow-Up Date"),
  },
  { label: "Notes", value: getField(lead, "notes", "Notes") },
  {
    label: "Additional Comments",
    value: getField(lead, "additionalComments", "Additional Comments"),
  },
  {
    label: "Source Link",
    value: getField(lead, "sourceLink", "Source Link"),
  },
  { label: "Assigned Agent", value: lead?.assignedToUser?.email },
  { label: "Agent Designation", value: lead?.assignedToUser?.designation },
  { label: "Manager", value: lead?.manager?.email },
  { label: "Manager Designation", value: lead?.manager?.designation },
  { label: "Team", value: lead?.team?.name },
  { label: "Department", value: lead?.department?.name },
  { label: "Created By", value: lead?.createdByUser?.email },
  { label: "Created By Role", value: lead?.createdByRole },
  { label: "Created", value: formatDateTime(lead?.createdAt) },
  { label: "Last Updated", value: formatDateTime(lead?.updatedAt) },
];

// ─── Badges ───────────────────────────────────────────────────────────────────
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

// ─── Accordion detail panel ───────────────────────────────────────────────────
function LeadDetailAccordion({ lead }: { lead: Lead }) {
  const rows = buildDetailRows(lead).filter(
    (r) =>
      r.value !== undefined &&
      r.value !== null &&
      String(r.value).trim() !== "",
  );

  return (
    <div className="bg-muted/30 border-t px-4 py-4 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Lead Details
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
        {rows.map((r) => {
          const val = String(r.value);
          const isLink = /^https?:\/\//i.test(val);
          return (
            <div key={r.label} className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {r.label}
              </p>
              <p className="text-sm font-medium break-words">
                {isLink ? (
                  <a
                    href={val}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {val}
                  </a>
                ) : (
                  val
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminAssignedLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orgAgents, setOrgAgents] = useState<OrgAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(
    new Set(),
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

  const [reAssignDialog, setReAssignDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<OrgAgent | null>(
    null,
  );
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
      for (const col of DETAIL_COLUMNS) {
        const q = (filters[col.key] ?? "").trim().toLowerCase();
        if (!q) continue;
        const v = col.get(l);
        if (v === undefined || v === null) return false;
        if (!String(v).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const displayedLeads = filteredLeads.slice(pageStart, pageStart + pageSize);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && v.trim() !== "",
  ).length;
  const resetFilters = () => setFilters({});

  const uniqueTeams = useMemo(
    () =>
      Array.from(
        new Map(
          leads.filter((l) => l.team).map((l) => [l.team!.id, l.team!]),
        ).values(),
      ),
    [leads],
  );

  const toggleExpand = (id: string) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setSelectedAgentInfo(orgAgents.find((a) => a.id === agentId) ?? null);
  };

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
      showToast(
        `Lead re-assigned to ${selectedAgentInfo?.email.split("@")[0]}`,
        "success",
      );
      closeReAssign();
      fetchData();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Re-assign failed",
        "destructive",
      );
    } finally {
      setReAssignLoading(false);
    }
  };

  const agentsByTeam = useMemo(
    () =>
      orgAgents.reduce<Record<string, OrgAgent[]>>((acc, agent) => {
        const key = agent.team?.name ?? "No Team";
        if (!acc[key]) acc[key] = [];
        acc[key].push(agent);
        return acc;
      }, {}),
    [orgAgents],
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 overflow-x-hidden w-full">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Assigned Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All agent-owned leads across your organization — re-assign to any
            active agent.
          </p>
        </div>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
          <div key={s.label} className={`rounded-lg border p-3 ${s.cls}`}>
            <p className="text-xl sm:text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
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

      {/* Table card */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-card w-full overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y">
            {displayedLeads.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                No leads found
              </div>
            ) : (
              displayedLeads.map((lead) => {
                const expanded = expandedLeadIds.has(lead.id);
                return (
                  <div key={lead.id}>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.phone}
                          </p>
                        </div>
                        {priorityBadge(lead.priority)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {lead.assignedToUser && (
                          <p>
                            Agent:{" "}
                            <span className="text-foreground font-medium">
                              {lead.assignedToUser.email.split("@")[0]}
                            </span>
                          </p>
                        )}
                        {lead.team && (
                          <p>
                            Team:{" "}
                            <span className="text-foreground">
                              {lead.team.name}
                            </span>
                          </p>
                        )}
                        {lead.department && (
                          <p>
                            Dept:{" "}
                            <span className="text-foreground">
                              {lead.department.name}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => toggleExpand(lead.id)}
                        >
                          {expanded ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
                              Details
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => openReAssign(lead)}
                        >
                          Re-assign
                        </Button>
                      </div>
                    </div>
                    {expanded && <LeadDetailAccordion lead={lead} />}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Lead
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Phone
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Priority
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Assigned Agent
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Manager
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Team
                  </th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">
                    Department
                  </th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayedLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {leads.length === 0
                        ? "No assigned leads found in your organization."
                        : "No leads match the current filters."}
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead) => {
                    const expanded = expandedLeadIds.has(lead.id);
                    return (
                      <Fragment key={lead.id}>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-medium">{lead.name}</p>
                          </td>
                          <td className="p-3 text-sm">{lead.phone}</td>
                          <td className="p-3">
                            {priorityBadge(lead.priority)}
                          </td>
                          <td className="p-3">
                            {lead.assignedToUser ? (
                              <div>
                                <p className="font-medium">
                                  {lead.assignedToUser.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lead.assignedToUser.designation}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {lead.manager ? (
                              <div>
                                <p className="font-medium">
                                  {lead.manager.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lead.manager.designation}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            {lead.team?.name ?? "—"}
                          </td>
                          <td className="p-3 text-sm">
                            {lead.department?.name ?? "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleExpand(lead.id)}
                                className="gap-1"
                              >
                                {expanded ? (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3.5 w-3.5" />
                                    View Details
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReAssign(lead)}
                              >
                                Re-assign
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <LeadDetailAccordion lead={lead} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Re-assign Modal */}
      <Dialog
        open={reAssignDialog}
        onOpenChange={(open) => !open && closeReAssign()}
      >
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
                    {selectedLead.department &&
                      ` · ${selectedLead.department.name}`}
                  </p>
                )}
              </div>
            )}

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
                  {Object.entries(agentsByTeam).map(
                    ([teamName, teamAgents]) => (
                      <div key={teamName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 sticky top-0">
                          {teamName}
                        </div>
                        {teamAgents.map((a) => {
                          const load = a._count?.assignedLeads ?? 0;
                          const limit = a.activeTicketLimit ?? 1;
                          const isCurrent =
                            a.id === selectedLead?.assignedToUserId;
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
                                  <span className="text-red-500 text-xs">
                                    (inactive)
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </div>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedAgentInfo &&
              selectedAgentInfo.id !== selectedLead?.assignedToUserId && (
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
                      <p className="text-xs text-muted-foreground">
                        Current Load
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Team · Branch
                      </p>
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
