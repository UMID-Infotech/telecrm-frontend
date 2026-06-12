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
import { ChevronDown, ChevronRight } from "lucide-react";

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
  { label: "Source Link", value: getField(lead, "sourceLink", "Source Link") },
  { label: "Created", value: formatDateTime(lead?.createdAt) },
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "L1_POOL">(
    "ALL",
  );

  // Filters
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [industryFilter, setIndustryFilter] = useState<string>("ALL");
  const [socialFilter, setSocialFilter] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Expanded rows
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    leadId: string;
  }>({
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter option lists (unique values) ─────────────────────────────────
  const uniq = (vals: (string | undefined)[]) =>
    Array.from(
      new Set(vals.filter((v): v is string => !!v && v.trim() !== "")),
    ).sort();

  const cityOptions = useMemo(
    () => uniq(leads.map((l) => getField(l, "city", "City / Location"))),
    [leads],
  );
  const industryOptions = useMemo(
    () => uniq(leads.map((l) => getField(l, "industry", "Industry / Sector"))),
    [leads],
  );
  const socialOptions = useMemo(
    () => uniq(leads.map((l) => getField(l, "socialMedia", "Social Media"))),
    [leads],
  );

  // ── Apply tab + filters ─────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (activeTab === "PENDING" && l.approvalStatus !== "PENDING")
        return false;
      if (activeTab === "L1_POOL" && l.distributionStage !== "L1_POOL")
        return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [l.name, l.phone, l.createdByUser?.email, l.team?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (cityFilter !== "ALL") {
        const v = getField(l, "city", "City / Location");
        if (v !== cityFilter) return false;
      }
      if (industryFilter !== "ALL") {
        const v = getField(l, "industry", "Industry / Sector");
        if (v !== industryFilter) return false;
      }
      if (socialFilter !== "ALL") {
        const v = getField(l, "socialMedia", "Social Media");
        if (v !== socialFilter) return false;
      }
      return true;
    });
  }, [leads, activeTab, search, cityFilter, industryFilter, socialFilter]);

  // Reset to page 1 when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, cityFilter, industryFilter, socialFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const displayedLeads = filteredLeads.slice(pageStart, pageStart + pageSize);

  // ── Select All logic for L1_POOL ─────────────────────────────────────────
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
      // Deselect all selectable leads on this page
      setSelectedLeadIds((prev) =>
        prev.filter((id) => !selectableLeadIds.includes(id)),
      );
    } else {
      // Select all selectable leads on this page
      setSelectedLeadIds((prev) =>
        Array.from(new Set([...prev, ...selectableLeadIds])),
      );
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Approve ───────────────────────────────────────────────────────────────
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

  const resetFilters = () => {
    setSearch("");
    setCityFilter("ALL");
    setIndustryFilter("ALL");
    setSocialFilter("ALL");
  };

  const visibleColCount = (activeTab === "L1_POOL" ? 1 : 0) + 9;

  return (
    <div className="p-6 space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Leads Management</h1>
          <p className="text-sm text-muted-foreground">
            Approve leads and distribute them to teams (L1 → L2 pipeline)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => (window.location.href = "/admin/leads/create")}
          >
            + New Lead
          </Button>
          {selectedLeadIds.length > 0 && (
            <Button variant="secondary" onClick={openDistDialog}>
              Distribute ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div key={s.label} className={`${s.cls} rounded-lg p-4 border`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-2">
        {(["ALL", "PENDING", "L1_POOL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            placeholder="Name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            City / Location
          </label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All cities</SelectItem>
              {cityOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Industry / Sector
          </label>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All industries</SelectItem>
              {industryOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Social Media
          </label>
          <Select value={socialFilter} onValueChange={setSocialFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All platforms</SelectItem>
              {socialOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button variant="outline" className="w-full" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </div>

      {/* Distribute banner */}
      {activeTab === "L1_POOL" && l1PoolLeads.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-blue-50 px-4 py-2">
          <p className="text-sm text-blue-900">
            ✓ Select leads below and click <strong>Distribute</strong> to assign
            them to teams
          </p>
          {selectedLeadIds.length > 0 && (
            <Button size="sm" onClick={openDistDialog}>
              Distribute Selected ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading leads…
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                {activeTab === "L1_POOL" && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
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
                  <TableCell
                    colSpan={visibleColCount + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                displayedLeads.map((lead) => {
                  const isOpen = !!expanded[lead.id];
                  const details = buildDetailRows(lead);
                  return (
                    // ✅ Fix: use Fragment with key instead of bare <>
                    <Fragment key={lead.id}>
                      <TableRow>
                        <TableCell>
                          <button
                            onClick={() => toggleExpand(lead.id)}
                            className="p-1 rounded hover:bg-muted"
                            aria-label="Toggle details"
                          >
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
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
                        <TableCell className="font-medium">
                          {lead.name}
                        </TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>{priorityBadge(lead.priority)}</TableCell>
                        <TableCell>
                          {approvalBadge(lead.approvalStatus)}
                        </TableCell>
                        <TableCell>
                          {stageBadge(lead.distributionStage)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.createdByUser?.email?.split("@")[0]} (
                          {lead.createdByRole})
                        </TableCell>
                        <TableCell>
                          {lead.team?.name ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpand(lead.id)}
                            >
                              {isOpen ? "Hide" : "View"} Details
                            </Button>
                            {lead.approvalStatus === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveLead(lead.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setRejectDialog({
                                      open: true,
                                      leadId: lead.id,
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {lead.distributionStage === "L1_POOL" &&
                              activeTab !== "L1_POOL" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedLeadIds([lead.id]);
                                    setActiveTab("L1_POOL");
                                  }}
                                >
                                  Distribute
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isOpen && (
                        <TableRow className="bg-muted/30">
                          <TableCell
                            colSpan={visibleColCount + 1}
                            className="p-0"
                          >
                            <div className="p-5">
                              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                                Full Lead Details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                                {details.map((row) => (
                                  <div
                                    key={row.label}
                                    className="flex flex-col"
                                  >
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {row.label}
                                    </span>
                                    <span className="text-sm break-words">
                                      {row.value !== undefined &&
                                      row.value !== null &&
                                      row.value !== ""
                                        ? String(row.value)
                                        : "—"}
                                    </span>
                                  </div>
                                ))}
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <strong>
                {filteredLeads.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, filteredLeads.length)}
              </strong>{" "}
              of <strong>{filteredLeads.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Rows per page
              </span>
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
              <span className="text-sm px-2">
                Page <strong>{currentPage}</strong> / {totalPages}
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
                Last »
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
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
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
