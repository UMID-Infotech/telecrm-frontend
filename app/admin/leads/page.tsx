"use client";

import { useEffect, useMemo, useState, useCallback, Fragment, useRef } from "react";
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
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter as FilterIcon,
  X,
} from "lucide-react";

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

const isUrl = (v: string): boolean => {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return true;
  if (/^www\./i.test(s)) return true;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(s)) return true;
  return false;
};

const toHref = (v: string): string => {
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};

const buildDetailRows = (lead: Lead) => [
  { label: "Name", value: lead?.name },
  { label: "Phone", value: lead?.phone },
  { label: "Email", value: getField(lead, "email", "Contact Email") },
  { label: "City / State", value: getField(lead, "city", "City / Location") },
  { label: "Business Name", value: getField(lead, "businessName", "Business Name") },
  { label: "Industry / Sector", value: getField(lead, "industry", "Industry / Sector") },
  { label: "Website (Y/N)", value: getField(lead, "websiteAvailable", "Website (Y/N)") },
  { label: "Website Link", value: getField(lead, "websiteLink", "Website Link") },
  { label: "Social Media", value: getField(lead, "socialMedia", "Social Media") },
  { label: "Quality of Online Presence", value: getField(lead, "qualityOfOnlinePresence", "Quality of Online Presence") },
  { label: "Contact Number", value: getField(lead, "contactNumber", "Contact Number") },
  { label: "Profile Link", value: getField(lead, "profileLink", "Profile Link (Link of Social Media Page)") },
  { label: "Contact Email", value: getField(lead, "contactEmail", "Contact Email") },
  { label: "Need Identified", value: getField(lead, "needIdentified", "Need Identified") },
  { label: "Source of Lead", value: getField(lead, "sourceOfLead", "Source of Lead") },
  { label: "Priority Level", value: getField(lead, "priorityLevel", "Priority Level") },
  { label: "Outreach Status", value: getField(lead, "outreachStatus", "Outreach Status") },
  { label: "Next Follow-Up Date", value: getField(lead, "nextFollowUpDate", "Next Follow-Up Date") },
  { label: "Notes", value: getField(lead, "notes", "Notes") },
  { label: "Additional Comments", value: getField(lead, "additionalComments", "Additional Comments") },
  { label: "Source Link", value: getField(lead, "sourceLink", "Source Link") },
  { label: "Created", value: formatDateTime(lead?.createdAt) },
];

// ─── Filter columns config ────────────────────────────────────────────────────
type FilterCol = {
  key: string;
  label: string;
  get: (lead: Lead) => string | undefined;
};

const FILTER_COLUMNS: FilterCol[] = [
  { key: "name", label: "Name", get: (l) => l?.name },
  { key: "phone", label: "Phone", get: (l) => l?.phone },
  { key: "email", label: "Email", get: (l) => getField(l, "email", "Contact Email") as string | undefined },
  { key: "city", label: "City / State", get: (l) => getField(l, "city", "City / Location") as string | undefined },
  { key: "businessName", label: "Business Name", get: (l) => getField(l, "businessName", "Business Name") as string | undefined },
  { key: "industry", label: "Industry / Sector", get: (l) => getField(l, "industry", "Industry / Sector") as string | undefined },
  { key: "websiteAvailable", label: "Website (Y/N)", get: (l) => getField(l, "websiteAvailable", "Website (Y/N)") as string | undefined },
  { key: "websiteLink", label: "Website Link", get: (l) => getField(l, "websiteLink", "Website Link") as string | undefined },
  { key: "socialMedia", label: "Social Media", get: (l) => getField(l, "socialMedia", "Social Media") as string | undefined },
  { key: "qualityOfOnlinePresence", label: "Quality of Online Presence", get: (l) => getField(l, "qualityOfOnlinePresence", "Quality of Online Presence") as string | undefined },
  { key: "contactNumber", label: "Contact Number", get: (l) => getField(l, "contactNumber", "Contact Number") as string | undefined },
  { key: "profileLink", label: "Profile Link", get: (l) => getField(l, "profileLink", "Profile Link (Link of Social Media Page)") as string | undefined },
  { key: "contactEmail", label: "Contact Email", get: (l) => getField(l, "contactEmail", "Contact Email") as string | undefined },
  { key: "needIdentified", label: "Need Identified", get: (l) => getField(l, "needIdentified", "Need Identified") as string | undefined },
  { key: "sourceOfLead", label: "Source of Lead", get: (l) => getField(l, "sourceOfLead", "Source of Lead") as string | undefined },
  { key: "priorityLevel", label: "Priority Level", get: (l) => getField(l, "priorityLevel", "Priority Level") as string | undefined },
  { key: "outreachStatus", label: "Outreach Status", get: (l) => getField(l, "outreachStatus", "Outreach Status") as string | undefined },
  { key: "nextFollowUpDate", label: "Next Follow-Up Date", get: (l) => getField(l, "nextFollowUpDate", "Next Follow-Up Date") as string | undefined },
  { key: "notes", label: "Notes", get: (l) => getField(l, "notes", "Notes") as string | undefined },
  { key: "additionalComments", label: "Additional Comments", get: (l) => getField(l, "additionalComments", "Additional Comments") as string | undefined },
  { key: "sourceLink", label: "Source Link", get: (l) => getField(l, "sourceLink", "Source Link") as string | undefined },
  { key: "priority", label: "Priority", get: (l) => l?.priority },
  { key: "approvalStatus", label: "Approval Status", get: (l) => l?.approvalStatus },
  { key: "distributionStage", label: "Stage", get: (l) => l?.distributionStage ?? undefined },
  { key: "createdBy", label: "Created By", get: (l) => l?.createdByUser?.email },
  { key: "createdByRole", label: "Created By Role", get: (l) => l?.createdByRole },
  { key: "team", label: "Team", get: (l) => l?.team?.name },
  { key: "createdAt", label: "Created", get: (l) => (l?.createdAt ? formatDateTime(l.createdAt) : undefined) },
];

// ─── Badges ──────────────────────────────────────────────────────────────────
const approvalBadge = (status: Lead["approvalStatus"]) => {
  const map: Record<Lead["approvalStatus"], "default" | "destructive" | "secondary"> = {
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
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[stage]}`}>
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
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[p]}`}>
      {p}
    </span>
  );
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
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pr-7"
          placeholder="Search…"
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow">
            {filtered.map((opt) => (
              <button
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
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

// ─── Mobile Lead Card ─────────────────────────────────────────────────────────
// [CHANGE] New component: renders each lead as a card on mobile instead of a table row.
// This replaces the table which overflows and becomes unreadable on small screens.
function MobileLeadCard({
  lead,
  isOpen,
  isSelected,
  showCheckbox,
  onToggleExpand,
  onToggleSelect,
  onApprove,
  onReject,
  onDistribute,
}: {
  lead: Lead;
  isOpen: boolean;
  isSelected: boolean;
  showCheckbox: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDistribute: () => void;
}) {
  const details = buildDetailRows(lead);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Card header row */}
      <div className="flex items-start gap-3 p-3">
        {showCheckbox && lead.distributionStage === "L1_POOL" && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="cursor-pointer mt-1 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{lead.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {priorityBadge(lead.priority)}
              {approvalBadge(lead.approvalStatus)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {stageBadge(lead.distributionStage)}
            {lead.team?.name && (
              <span className="text-xs text-muted-foreground">{lead.team.name}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lead.createdByUser?.email?.split("@")[0]} ({lead.createdByRole})
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <Button size="sm" variant="ghost" onClick={onToggleExpand} className="text-xs h-7">
          {isOpen ? "Hide Details" : "View Details"}
          {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
        {lead.approvalStatus === "PENDING" && (
          <>
            <Button size="sm" onClick={onApprove} className="text-xs h-7">Approve</Button>
            <Button size="sm" variant="destructive" onClick={onReject} className="text-xs h-7">Reject</Button>
          </>
        )}
        {lead.distributionStage === "L1_POOL" && !showCheckbox && (
          <Button size="sm" variant="secondary" onClick={onDistribute} className="text-xs h-7">
            Distribute
          </Button>
        )}
      </div>

      {/* Expanded details */}
      {isOpen && (
        <div className="border-t bg-muted/30 p-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Full Lead Details
          </h4>
          <div className="grid grid-cols-1 gap-y-2">
            {details.map((row) => {
              const raw =
                row.value !== undefined && row.value !== null && row.value !== ""
                  ? String(row.value)
                  : null;
              return (
                <div key={row.label} className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
                  {raw === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : isUrl(raw) ? (
                    <a
                      href={toHref(raw)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline break-all hover:text-blue-800"
                    >
                      {raw}
                    </a>
                  ) : (
                    <span className="text-xs break-words">{raw}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "L1_POOL">("ALL");

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  // [CHANGE] Added ref to anchor the filter dropdown to the Filter button's position.
  // Previously the accordion rendered as a block element far below the header,
  // appearing just before the table. Now it's anchored inline right below the button.
  const filterButtonRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; leadId: string }>({
    open: false,
    leadId: "",
  });
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const optionsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of FILTER_COLUMNS) {
      const set = new Set<string>();
      for (const l of leads) {
        const v = col.get(l);
        if (v !== undefined && v !== null && String(v).trim() !== "") set.add(String(v));
      }
      map[col.key] = Array.from(set).sort();
    }
    return map;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (activeTab === "PENDING" && l.approvalStatus !== "PENDING") return false;
      if (activeTab === "L1_POOL" && l.distributionStage !== "L1_POOL") return false;
      for (const col of FILTER_COLUMNS) {
        const q = (filters[col.key] ?? "").trim().toLowerCase();
        if (!q) continue;
        const v = col.get(l);
        if (v === undefined || v === null) return false;
        if (!String(v).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, activeTab, filters]);

  useEffect(() => { setPage(1); }, [activeTab, filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const displayedLeads = filteredLeads.slice(pageStart, pageStart + pageSize);

  const selectableLeadIds = useMemo(
    () => displayedLeads.filter((l) => l.distributionStage === "L1_POOL").map((l) => l.id),
    [displayedLeads],
  );

  const allSelected =
    selectableLeadIds.length > 0 && selectableLeadIds.every((id) => selectedLeadIds.includes(id));
  const someSelected =
    !allSelected && selectableLeadIds.some((id) => selectedLeadIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !selectableLeadIds.includes(id)));
    } else {
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...selectableLeadIds])));
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

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

  const toggleLeadSelect = (id: string) =>
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const openDistDialog = () => {
    if (selectedLeadIds.length === 0) {
      showToast("Select at least one lead from L1 Pool to distribute", "destructive");
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
      showToast(`${selectedLeadIds.length} lead(s) distributed to team`, "success");
      setDistDialog(false);
      setSelectedLeadIds([]);
      setDistTeamId("");
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Distribution failed", "destructive");
    } finally {
      setDistLoading(false);
    }
  };

  const l1PoolLeads = leads.filter((l) => l.distributionStage === "L1_POOL");
  const activeFilterCount = Object.values(filters).filter((v) => v && v.trim() !== "").length;
  const resetFilters = () => setFilters({});
  const visibleColCount = (activeTab === "L1_POOL" ? 1 : 0) + 9;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {ToastComponent}

      {/* ── Header ── */}
      {/* [CHANGE] Header is now a single column on mobile (stacked), side-by-side on sm+.
          The Filter button's container uses `relative` so the dropdown anchors to it. */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Leads Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Approve leads and distribute them to teams (L1 → L2 pipeline)
          </p>
        </div>

        {/* [CHANGE] Wrapped the button row + filter dropdown together in a relative div.
            The filter accordion now uses absolute positioning to drop directly
            below the Filter button instead of flowing into the page layout. */}
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={() => (window.location.href = "/admin/leads/create")} size="sm">
            + New Lead
          </Button>

          {/* Filter button wrapper with relative positioning for dropdown anchor */}
          <div className="relative" ref={filterButtonRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
            >
              <FilterIcon className="h-4 w-4 mr-1" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              {filterOpen ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>

            {/* [CHANGE] Filter accordion is now absolutely positioned below the button.
                `right-0` aligns it to the right edge of the button; `w-[min(90vw,720px)]`
                makes it wide but never overflows the viewport on mobile.
                Previously this lived in the main page flow and appeared right before the table. */}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 z-30 w-[min(90vw,720px)] rounded-md border bg-card shadow-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Filter by any column</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
                    <Button variant="outline" size="sm" onClick={() => setFilterOpen(false)}>Close</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                  {FILTER_COLUMNS.map((col) => (
                    <ColumnFilter
                      key={col.key}
                      label={col.label}
                      value={filters[col.key] ?? ""}
                      options={optionsByKey[col.key] ?? []}
                      onChange={(v) => setFilters((prev) => ({ ...prev, [col.key]: v }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedLeadIds.length > 0 && (
            <Button variant="secondary" size="sm" onClick={openDistDialog}>
              Distribute ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      {/* [CHANGE] Changed from grid-cols-2 sm:grid-cols-4 to always 2-col on mobile,
          4-col on sm+. Tightened padding on mobile so cards don't feel cramped.
          Added `text-center` on mobile for better visual balance. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", count: leads.length, cls: "bg-slate-50" },
          {
            label: "Pending",
            count: leads.filter((l) => l.approvalStatus === "PENDING").length,
            cls: "bg-yellow-50",
          },
          { label: "L1 Pool", count: l1PoolLeads.length, cls: "bg-blue-50" },
          {
            label: "Distributed",
            count: leads.filter(
              (l) => l.distributionStage === "L2_POOL" || l.distributionStage === "AGENT_OWNED",
            ).length,
            cls: "bg-green-50",
          },
        ].map((s) => (
          <div key={s.label} className={`${s.cls} rounded-lg p-2.5 sm:p-4 border text-center sm:text-left`}>
            <p className="text-lg sm:text-2xl font-bold">{s.count}</p>
            {/* [CHANGE] Shortened "Pending Approval" → "Pending" and "L1 Pool (Ready)" → "L1 Pool"
                to prevent text overflow on narrow mobile cards. */}
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      {/* [CHANGE] Tabs now scroll horizontally on mobile instead of wrapping/overflowing. */}
      <div className="border-b flex gap-0 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {(["ALL", "PENDING", "L1_POOL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "ALL" ? "All Leads" : tab === "PENDING" ? "Needs Approval" : "L1 Pool"}
          </button>
        ))}
      </div>

      {/* ── Distribute banner ── */}
      {activeTab === "L1_POOL" && l1PoolLeads.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-blue-50 px-3 sm:px-4 py-2 gap-3 flex-wrap">
          <p className="text-xs sm:text-sm text-blue-900">
            ✓ Select leads and click <strong>Distribute</strong> to assign to teams
          </p>
          {selectedLeadIds.length > 0 && (
            <Button size="sm" onClick={openDistDialog}>
              Distribute ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      )}

      {/* ── Table / Cards ── */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading leads…</div>
      ) : (
        <>
          {/* [CHANGE] Desktop table: hidden on mobile (hidden sm:block).
              No changes to the table itself — it already works on desktop. */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  {activeTab === "L1_POOL" && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        aria-label="Select all leads on this page"
                        title="Select all"
                        className="cursor-pointer"
                      />
                    </TableHead>
                  )}
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColCount + 1} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedLeads.map((lead) => {
                    const isOpen = !!expanded[lead.id];
                    const details = buildDetailRows(lead);
                    return (
                      <Fragment key={lead.id}>
                        <TableRow>
                          <TableCell>
                            <button
                              onClick={() => toggleExpand(lead.id)}
                              className="p-1 rounded hover:bg-muted"
                              aria-label="Toggle details"
                            >
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </TableCell>
                          {activeTab === "L1_POOL" && (
                            <TableCell>
                              {lead.distributionStage === "L1_POOL" && (
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.includes(lead.id)}
                                  onChange={() => toggleLeadSelect(lead.id)}
                                  className="cursor-pointer"
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{priorityBadge(lead.priority)}</TableCell>
                          <TableCell>{approvalBadge(lead.approvalStatus)}</TableCell>
                          <TableCell>{stageBadge(lead.distributionStage)}</TableCell>
                          <TableCell className="text-sm">
                            {lead.createdByUser?.email?.split("@")[0]} ({lead.createdByRole})
                          </TableCell>
                          <TableCell>
                            {lead.team?.name ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => toggleExpand(lead.id)}>
                                {isOpen ? "Hide" : "View"} Details
                              </Button>
                              {lead.approvalStatus === "PENDING" && (
                                <>
                                  <Button size="sm" onClick={() => approveLead(lead.id)}>Approve</Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectDialog({ open: true, leadId: lead.id })}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {lead.distributionStage === "L1_POOL" && activeTab !== "L1_POOL" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => { setSelectedLeadIds([lead.id]); setActiveTab("L1_POOL"); }}
                                >
                                  Distribute
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* ── Expanded detail row ── */}
                        {isOpen && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={visibleColCount + 1} className="p-0">
                              <div className="p-5">
                                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                                  Full Lead Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                                  {details.map((row) => {
                                    const raw =
                                      row.value !== undefined && row.value !== null && row.value !== ""
                                        ? String(row.value)
                                        : null;
                                    return (
                                      <div key={row.label} className="flex flex-col">
                                        <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
                                        {raw === null ? (
                                          <span className="text-sm text-muted-foreground">—</span>
                                        ) : isUrl(raw) ? (
                                          <a
                                            href={toHref(raw)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-blue-600 underline break-all hover:text-blue-800"
                                          >
                                            {raw}
                                          </a>
                                        ) : (
                                          <span className="text-sm break-words">{raw}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* [CHANGE] Mobile card list: shown only on mobile (sm:hidden).
              Each lead renders as a card via MobileLeadCard component.
              This avoids the horizontal overflow issue tables cause on narrow screens. */}
          <div className="sm:hidden space-y-3">
            {displayedLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No leads found</div>
            ) : (
              displayedLeads.map((lead) => (
                <MobileLeadCard
                  key={lead.id}
                  lead={lead}
                  isOpen={!!expanded[lead.id]}
                  isSelected={selectedLeadIds.includes(lead.id)}
                  showCheckbox={activeTab === "L1_POOL"}
                  onToggleExpand={() => toggleExpand(lead.id)}
                  onToggleSelect={() => toggleLeadSelect(lead.id)}
                  onApprove={() => approveLead(lead.id)}
                  onReject={() => setRejectDialog({ open: true, leadId: lead.id })}
                  onDistribute={() => { setSelectedLeadIds([lead.id]); setActiveTab("L1_POOL"); }}
                />
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          {/* [CHANGE] Pagination stacks vertically on mobile: count on top, controls below.
              Page number buttons are hidden on mobile to save space; only Prev/Next shown. */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t bg-muted/20 gap-3 rounded-b-lg border border-t-0">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <strong>
                {filteredLeads.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, filteredLeads.length)}
              </strong>{" "}
              of <strong>{filteredLeads.length}</strong>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              <span className="text-xs sm:text-sm text-muted-foreground">Rows</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-16 sm:w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* First/Last hidden on mobile */}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                className="hidden sm:inline-flex"
              >
                « First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </Button>
              <span className="text-xs sm:text-sm px-1 sm:px-2">
                <strong>{currentPage}</strong> / {totalPages}
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
                className="hidden sm:inline-flex"
              >
                Last »
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Reject Dialog ── */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(o) => setRejectDialog({ open: o, leadId: rejectDialog.leadId })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Lead</DialogTitle>
            <DialogDescription>Provide a reason for rejection (optional)</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, leadId: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Distribute Dialog ── */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribute to Team</DialogTitle>
            <DialogDescription>
              Distributing {selectedLeadIds.length} lead(s) — L1 Pool → Team Pool
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Distribution Mode</label>
              <Select value={distMode} onValueChange={(v) => setDistMode(v as "MANUAL" | "AUTO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual — pick a team</SelectItem>
                  <SelectItem value="AUTO">Auto — round-robin by priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {distMode === "MANUAL" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Team</label>
                <Select value={distTeamId} onValueChange={setDistTeamId}>
                  <SelectTrigger><SelectValue placeholder="Choose a team…" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.manager?.email?.split("@")[0]} ({t._count?.members} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>Cancel</Button>
            <Button onClick={distribute} disabled={distLoading}>
              {distLoading ? "Distributing…" : "Distribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}