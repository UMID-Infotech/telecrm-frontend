// telecrm/app/manager/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

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
  currentJourneyStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  data?: Record<string, any>;
  conversations?: Conversation[];
  followUps?: FollowUp[];
  statusHistory?: StatusHistory[];
  activities?: Array<{
    id: string;
    callType: string;
    outcome: "CONNECTED" | "NOT_CONNECTED";
    calledAt: string;
  }>;
}

interface Conversation {
  id: string;
  type: string;
  callDisposition?: string | null;
  notes?: string | null;
  followUpDate?: string | null; // date the agent typed when scheduling a follow-up
  statusBefore?: string | null;
  statusAfter?: string | null;
  callDuration?: number | null;
  nextAction?: string | null;
  createdAt: string;
  agent?: { id: string; email: string; designation: string };
}

interface FollowUp {
  id: string;
  followUpAt: string;
  notes?: string | null;
  status: "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";
  assignedTo?: { id: string; email: string; designation: string };
}

interface StatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  remarks?: string | null;
  createdAt: string;
  changedBy?: { id: string; email: string; designation: string };
}

interface AgentMember {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  totalAssigned: number;
  leads: Lead[];
}

interface TeamOverview {
  id: string;
  name: string;
  poolLeads: Lead[];
  members: AgentMember[];
}

interface Agent {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  _count: { assignedLeads: number };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};
const inRange = (
  iso: string | undefined | null,
  from: string,
  to: string,
): boolean => {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= from && d <= to;
};
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Date-range filtering for the Team Pipeline table ─────────────────────────

function filterLeadTimelineByDateRange(
  lead: Lead,
  from: string,
  to: string,
): Lead {
  return {
    ...lead,
    conversations: (lead.conversations ?? []).filter((c) =>
      inRange(c.createdAt, from, to),
    ),
    followUps: (lead.followUps ?? []).filter((f) =>
      inRange(f.followUpAt, from, to),
    ),
    statusHistory: (lead.statusHistory ?? []).filter((s) =>
      inRange(s.createdAt, from, to),
    ),
    activities: (lead.activities ?? []).filter((a) =>
      inRange(a.calledAt, from, to),
    ),
  };
}

function filterTeamTimelineByDateRange(
  team: TeamOverview,
  from: string,
  to: string,
): TeamOverview {
  return {
    ...team,
    poolLeads: team.poolLeads.map((lead) =>
      filterLeadTimelineByDateRange(lead, from, to),
    ),
    members: team.members.map((agent) => ({
      ...agent,
      leads: agent.leads.map((lead) =>
        filterLeadTimelineByDateRange(lead, from, to),
      ),
    })),
  };
}

// ─── Connected/NotConnected sets ──────────────────────────────────────────────

const CONNECTED_DISPOSITIONS = new Set([
  "CONNECTED",
  "INTERESTED",
  "CALLBACK_REQUESTED",
  "FOLLOW_UP_REQUIRED",
  "CONVERTED",
]);
const NOT_CONNECTED_DISPOSITIONS = new Set([
  "NOT_REACHABLE",
  "SWITCHED_OFF",
  "BUSY",
  "WRONG_NUMBER",
  "NOT_INTERESTED",
]);

// ─── Badge helpers ────────────────────────────────────────────────────────────

function PriorityBadge({ p }: { p: Lead["priority"] }) {
  const cls = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-orange-100 text-orange-700",
    LOW: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${cls[p]}`}
    >
      {p}
    </span>
  );
}

function JourneyBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    FRESH_LEAD: "bg-slate-100 text-slate-700",
    ATTEMPTED_CONTACT: "bg-yellow-100 text-yellow-800",
    CONNECTED: "bg-blue-100 text-blue-800",
    QUALIFIED: "bg-indigo-100 text-indigo-800",
    INTERESTED: "bg-green-100 text-green-800",
    FOLLOW_UP_SCHEDULED: "bg-orange-100 text-orange-800",
    NEGOTIATION: "bg-purple-100 text-purple-800",
    DOCUMENTATION_PENDING: "bg-pink-100 text-pink-800",
    CONVERTED: "bg-emerald-100 text-emerald-800",
    LOST: "bg-red-100 text-red-700",
    NOT_INTERESTED: "bg-gray-100 text-gray-600",
    DUPLICATE: "bg-gray-100 text-gray-600",
    INVALID_LEAD: "bg-gray-100 text-gray-600",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
}

function FollowUpStatusBadge({ status }: { status: FollowUp["status"] }) {
  const cls = {
    PENDING: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
    MISSED: "bg-red-100 text-red-700",
    RESCHEDULED: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${cls[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Conversation type config ─────────────────────────────────────────────────

const CONV_CONFIG: Record<
  string,
  { label: string; color: string; dot: string; icon: string }
> = {
  CALL_LOG: {
    label: "Call",
    color: "border-blue-300 bg-blue-50",
    dot: "bg-blue-500",
    icon: "📞",
  },
  FOLLOW_UP_NOTE: {
    label: "Follow-up",
    color: "border-orange-300 bg-orange-50",
    dot: "bg-orange-500",
    icon: "🔔",
  },
  WHATSAPP_INTERACTION: {
    label: "WhatsApp",
    color: "border-green-300 bg-green-50",
    dot: "bg-green-500",
    icon: "💬",
  },
  SMS_LOG: {
    label: "SMS",
    color: "border-teal-300 bg-teal-50",
    dot: "bg-teal-500",
    icon: "📱",
  },
  EMAIL_ACTIVITY: {
    label: "Email",
    color: "border-violet-300 bg-violet-50",
    dot: "bg-violet-500",
    icon: "✉️",
  },
  INTERNAL_NOTE: {
    label: "Note",
    color: "border-yellow-300 bg-yellow-50",
    dot: "bg-yellow-500",
    icon: "📝",
  },
  MEETING_SCHEDULED: {
    label: "Meeting",
    color: "border-purple-300 bg-purple-50",
    dot: "bg-purple-500",
    icon: "📅",
  },
  SITE_VISIT: {
    label: "Site Visit",
    color: "border-pink-300 bg-pink-50",
    dot: "bg-pink-500",
    icon: "🏠",
  },
  STATUS_CHANGE: {
    label: "Status",
    color: "border-slate-300 bg-slate-50",
    dot: "bg-slate-400",
    icon: "🔄",
  },
  REASSIGNMENT_ACTIVITY: {
    label: "Reassigned",
    color: "border-gray-300 bg-gray-50",
    dot: "bg-gray-400",
    icon: "🔀",
  },
};

function dispositionLabel(d?: string | null) {
  if (!d) return null;
  const map: Record<string, string> = {
    CONNECTED: "Connected ✓",
    NOT_REACHABLE: "Not Reachable",
    SWITCHED_OFF: "Switched Off",
    BUSY: "Busy",
    WRONG_NUMBER: "Wrong Number",
    INTERESTED: "Interested ✓",
    NOT_INTERESTED: "Not Interested",
    CALLBACK_REQUESTED: "Callback Requested",
    FOLLOW_UP_REQUIRED: "Follow-up Required",
    CONVERTED: "Converted 🎉",
  };
  return map[d] ?? d;
}

function dispositionColor(d?: string | null) {
  if (!d) return "bg-gray-100 text-gray-600";
  if (CONNECTED_DISPOSITIONS.has(d)) return "bg-green-100 text-green-700";
  if (NOT_CONNECTED_DISPOSITIONS.has(d)) return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-600";
}

// ─── Conversation Timeline ────────────────────────────────────────────────────

function ConversationTimeline({
  conversations,
  followUps,
  statusHistory,
}: {
  conversations: Conversation[];
  followUps: FollowUp[];
  statusHistory: StatusHistory[];
}) {
  type TimelineEvent =
    | { kind: "conv"; data: Conversation; ts: string }
    | { kind: "followup"; data: FollowUp; ts: string }
    | { kind: "status"; data: StatusHistory; ts: string };

  const events: TimelineEvent[] = [
    ...conversations.map((c) => ({
      kind: "conv" as const,
      data: c,
      ts: c.createdAt,
    })),
    ...followUps.map((f) => ({
      kind: "followup" as const,
      data: f,
      ts: f.followUpAt,
    })),
    ...statusHistory.map((s) => ({
      kind: "status" as const,
      data: s,
      ts: s.createdAt,
    })),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  if (events.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-3 text-center">
        No conversation history in the selected date range
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-3">
        {events.map((event) => {
          if (event.kind === "conv") {
            const conv = event.data;
            const cfg = CONV_CONFIG[conv.type] ?? CONV_CONFIG.INTERNAL_NOTE;
            return (
              <div key={`conv-${conv.id}`} className="relative">
                <div
                  className={`absolute -left-6 top-2 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`}
                />
                <div className={`rounded-lg border p-3 ${cfg.color}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {cfg.icon} {cfg.label}
                    </span>
                    {conv.callDisposition && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${dispositionColor(conv.callDisposition)}`}
                      >
                        {dispositionLabel(conv.callDisposition)}
                      </span>
                    )}
                    {conv.callDuration && (
                      <span className="text-[10px] text-slate-500">
                        ⏱ {Math.floor(conv.callDuration / 60)}m{" "}
                        {conv.callDuration % 60}s
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {formatDateTime(conv.createdAt)}
                    </span>
                  </div>
                  {conv.agent && (
                    <p className="text-[10px] text-slate-500 mb-1">
                      by {conv.agent.designation} · {conv.agent.email}
                    </p>
                  )}
                  {conv.statusBefore &&
                    conv.statusAfter &&
                    conv.statusBefore !== conv.statusAfter && (
                      <p className="text-[10px] text-slate-600 mb-1">
                        Status:{" "}
                        <span className="line-through">
                          {conv.statusBefore?.replace(/_/g, " ")}
                        </span>{" "}
                        →{" "}
                        <strong>{conv.statusAfter?.replace(/_/g, " ")}</strong>
                      </p>
                    )}
                  {conv.notes && (
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {conv.notes}
                    </p>
                  )}
                  {conv.nextAction && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Next: {conv.nextAction}
                    </p>
                  )}
                  {conv.followUpDate && (
                    <p className="text-[10px] text-orange-600 mt-1 font-medium">
                      📅 Follow-up: {formatDateTime(conv.followUpDate)}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (event.kind === "followup") {
            const fu = event.data;
            return (
              <div key={`fu-${fu.id}`} className="relative">
                <div className="absolute -left-6 top-2 w-2.5 h-2.5 rounded-full border-2 border-white bg-orange-400" />
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      🔔 Follow-up Scheduled
                    </span>
                    <FollowUpStatusBadge status={fu.status} />
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {formatDateTime(fu.followUpAt)}
                    </span>
                  </div>
                  {fu.assignedTo && (
                    <p className="text-[10px] text-slate-500 mb-1">
                      assigned to {fu.assignedTo.designation} ·{" "}
                      {fu.assignedTo.email}
                    </p>
                  )}
                  {fu.notes && (
                    <p className="text-xs text-slate-700 mt-1">{fu.notes}</p>
                  )}
                </div>
              </div>
            );
          }

          const sh = event.data;
          return (
            <div key={`sh-${sh.id}`} className="relative">
              <div className="absolute -left-6 top-2 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-400" />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-600">
                    🔄 Status changed
                  </span>
                  <span className="text-[10px] text-slate-500">
                    <span className="line-through">
                      {sh.fromStatus?.replace(/_/g, " ")}
                    </span>
                    {" → "}
                    <strong className="text-slate-700">
                      {sh.toStatus?.replace(/_/g, " ")}
                    </strong>
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {formatDateTime(sh.createdAt)}
                  </span>
                </div>
                {sh.changedBy && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    by {sh.changedBy.designation} · {sh.changedBy.email}
                  </p>
                )}
                {sh.remarks && (
                  <p className="text-[10px] text-slate-600 mt-0.5 italic">
                    {sh.remarks}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lead Card (expandable) ───────────────────────────────────────────────────

function LeadCard({
  lead,
  dateFrom,
  dateTo,
}: {
  lead: Lead;
  dateFrom: string;
  dateTo: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const lastConv = lead.conversations?.[lead.conversations.length - 1];
  const pendingFollowUps = (lead.followUps ?? []).filter(
    (f) => f.status === "PENDING",
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {lead.name?.[0]?.toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {lead.name}
              </p>
              <PriorityBadge p={lead.priority} />
              <JourneyBadge status={lead.currentJourneyStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{lead.phone}</p>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-400">
              {lead.createdAt && (
                <span>Created {formatDate(lead.createdAt)}</span>
              )}
              {lead.updatedAt && (
                <span>Updated {formatDate(lead.updatedAt)}</span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {lead.conversations?.length ?? 0} interactions
              </span>
              {pendingFollowUps.length > 0 && (
                <span className="text-orange-600 font-medium">
                  🔔 {pendingFollowUps.length} pending follow-up
                  {pendingFollowUps.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {lastConv && !expanded && (
          <div className="mt-2 ml-12 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 truncate">
            <span className="font-medium">Last:</span>{" "}
            {CONV_CONFIG[lastConv.type]?.icon}{" "}
            {CONV_CONFIG[lastConv.type]?.label}
            {lastConv.callDisposition && (
              <> · {dispositionLabel(lastConv.callDisposition)}</>
            )}
            {lastConv.notes && (
              <>
                {" "}
                · "{lastConv.notes.slice(0, 60)}
                {lastConv.notes.length > 60 ? "…" : ""}"
              </>
            )}
            <span className="ml-1 text-slate-400">
              ({formatDate(lastConv.createdAt)})
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50">
          {lead.data && Object.keys(lead.data).length > 0 && (
            <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 border-b border-slate-100 bg-white">
              {Object.entries(lead.data).map(([k, v]) =>
                v != null && v !== "" ? (
                  <div key={k} className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide truncate">
                      {k.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-slate-700 truncate">
                      {String(v)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-blue-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Conversation History
              <span className="ml-auto text-[10px] font-normal text-slate-400 normal-case tracking-normal">
                {formatDate(dateFrom)} – {formatDate(dateTo)}
              </span>
            </p>
            <ConversationTimeline
              conversations={lead.conversations ?? []}
              followUps={lead.followUps ?? []}
              statusHistory={lead.statusHistory ?? []}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent Row (expandable) ───────────────────────────────────────────────────

function AgentSection({
  agent,
  dateFrom,
  dateTo,
}: {
  agent: AgentMember;
  dateFrom: string;
  dateTo: string;
}) {
  const [open, setOpen] = useState(false);

  const totalConversations = agent.leads.reduce(
    (acc, l) => acc + (l.conversations?.length ?? 0),
    0,
  );
  const activeLeads = agent.leads.filter(
    (l) =>
      ![
        "CONVERTED",
        "LOST",
        "NOT_INTERESTED",
        "DUPLICATE",
        "INVALID_LEAD",
      ].includes(l.currentJourneyStatus ?? ""),
  ).length;

  const untouchedLeads = agent.leads.filter((lead) => {
    const hasConversation = (lead.conversations?.length ?? 0) > 0;
    const hasActivity = (lead.activities?.length ?? 0) > 0;

    return (
      lead.currentJourneyStatus === "FRESH_LEAD" &&
      !hasConversation &&
      !hasActivity
    );
  }).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
          {agent.email?.[0]?.toUpperCase() ?? "A"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {agent.email}
            </p>
            {!agent.isActive && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                Inactive
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{agent.designation}</p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-800">
              {agent.leads.length}
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">
              Leads
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600">{activeLeads}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">
              Active
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600">
              {totalConversations}
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">
              Interactions
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-orange-600">
              {untouchedLeads}
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">
              Fresh
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500">
              {agent.activeTicketLimit}
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">
              Limit
            </p>
          </div>
        </div>

        <div
          className={`shrink-0 text-slate-400 transition-transform duration-200 ml-2 ${open ? "rotate-180" : ""}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {!open && (
        <div className="sm:hidden flex items-center gap-4 px-4 pb-3 text-center">
          <div>
            <p className="text-xs font-bold text-slate-800">
              {agent.leads.length}
            </p>
            <p className="text-[9px] text-slate-400">Leads</p>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600">{activeLeads}</p>
            <p className="text-[9px] text-slate-400">Active</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600">
              {totalConversations}
            </p>
            <p className="text-[9px] text-slate-400">Interactions</p>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
          {agent.leads.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 italic">
              No leads assigned to this agent yet
            </p>
          ) : (
            agent.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Panel ───────────────────────────────────────────────────────────────

function TeamPanel({
  team,
  defaultOpen,
  dateFrom,
  dateTo,
}: {
  team: TeamOverview;
  defaultOpen: boolean;
  dateFrom: string;
  dateTo: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"agents" | "pool">("agents");

  const totalLeads = team.members.reduce((a, m) => a + m.leads.length, 0);
  const totalConvs = team.members.reduce(
    (a, m) =>
      a + m.leads.reduce((b, l) => b + (l.conversations?.length ?? 0), 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm">
          {team.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-800">{team.name}</p>
          <p className="text-xs text-slate-500">
            {team.members.length} agent{team.members.length !== 1 ? "s" : ""}
            {" · "}
            {totalLeads} lead{totalLeads !== 1 ? "s" : ""}
            {" · "}
            {totalConvs} interaction{totalConvs !== 1 ? "s" : ""}
            {team.poolLeads.length > 0 && (
              <span className="ml-1 text-blue-600 font-medium">
                · {team.poolLeads.length} in pool
              </span>
            )}
          </p>
        </div>
        <div
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="flex border-b border-slate-100 bg-slate-50 px-4">
            <button
              type="button"
              onClick={() => setTab("agents")}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                tab === "agents"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Agents & Leads ({team.members.length})
            </button>
            {team.poolLeads.length > 0 && (
              <button
                type="button"
                onClick={() => setTab("pool")}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  tab === "pool"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Team Pool ({team.poolLeads.length})
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {tab === "agents" &&
              (team.members.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 italic">
                  No agents in this team yet
                </p>
              ) : (
                team.members.map((agent) => (
                  <AgentSection
                    key={agent.id}
                    agent={agent}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                ))
              ))}
            {tab === "pool" &&
              (team.poolLeads.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 italic">
                  No unassigned leads in pool
                </p>
              ) : (
                team.poolLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                ))
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-w-0">
      <div className={`h-1 w-full ${accent}`} />
      <div className="p-4 flex items-start gap-3 flex-1">
        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${accent} bg-opacity-10`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconUsers = () => (
  <svg
    className="w-5 h-5 text-blue-600"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87M12 12a4 4 0 100-8 4 4 0 000 8z"
    />
  </svg>
);
const IconCheck = () => (
  <svg
    className="w-5 h-5 text-green-600"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IconX = () => (
  <svg
    className="w-5 h-5 text-red-500"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IconClock = () => (
  <svg
    className="w-5 h-5 text-orange-500"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IconCalendar = () => (
  <svg
    className="w-5 h-5 text-purple-600"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);
const IconTrophy = () => (
  <svg
    className="w-5 h-5 text-yellow-600"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);
const IconStack = () => (
  <svg
    className="w-5 h-5 text-blue-500"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);
const IconUserCheck = () => (
  <svg
    className="w-5 h-5 text-emerald-600"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);
const IconChevronDown = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

// ─── Disposition/connected helpers ────────────────────────────────────────────

const CONNECTED_SET = new Set([
  "CONNECTED",
  "INTERESTED",
  "CALLBACK_REQUESTED",
  "FOLLOW_UP_REQUIRED",
  "CONVERTED",
]);
const NOT_CONNECTED_SET = new Set([
  "NOT_REACHABLE",
  "SWITCHED_OFF",
  "BUSY",
  "WRONG_NUMBER",
  "NOT_INTERESTED",
]);

// ─── Follow-up detection helper ───────────────────────────────────────────────
//
// A lead counts as a "follow-up" in the selected period if ANY of:
//
//  1. LeadFollowUp table: a row exists with followUpAt inside [from, to].
//     All statuses count (PENDING / COMPLETED / MISSED / RESCHEDULED) because
//     a completed or missed follow-up still happened in that window.
//
//  2. Conversation.followUpDate: the agent typed a follow-up date on any
//     conversation log that lands inside [from, to]. This fires even if no
//     formal LeadFollowUp row was created.
//
//  3. Status moved to FOLLOW_UP_SCHEDULED inside [from, to].
//     Priority order:
//       a. statusHistory.toStatus — most reliable; written by the system
//          whenever the journey status changes.
//       b. conversation.statusAfter — written by the agent during a call log;
//          present when statusHistory rows are absent.
//       c. currentJourneyStatus === "FOLLOW_UP_SCHEDULED" AND
//          lead.updatedAt inside [from, to] — last resort when no history
//          whatsoever is available.
//
// The whole thing is a single `.filter()` returning true/false per lead,
// so the same lead is never counted twice regardless of how many signals fire.

function isFollowUpInRange(lead: Lead, from: string, to: string): boolean {
  // ── Signal 1: LeadFollowUp rows ──────────────────────────────────────────
  if ((lead.followUps ?? []).some((f) => inRange(f.followUpAt, from, to))) {
    return true;
  }

  // ── Signal 2: Conversation.followUpDate ──────────────────────────────────
  if (
    (lead.conversations ?? []).some((c) => inRange(c.followUpDate, from, to))
  ) {
    return true;
  }

  // ── Signal 3a: statusHistory transition → FOLLOW_UP_SCHEDULED ───────────
  const history = lead.statusHistory ?? [];
  if (history.length > 0) {
    return history.some(
      (s) =>
        s.toStatus === "FOLLOW_UP_SCHEDULED" && inRange(s.createdAt, from, to),
    );
  }

  // ── Signal 3b: conversation.statusAfter → FOLLOW_UP_SCHEDULED ───────────
  const convs = lead.conversations ?? [];
  if (
    convs.some(
      (c) =>
        c.statusAfter === "FOLLOW_UP_SCHEDULED" &&
        inRange(c.createdAt, from, to),
    )
  ) {
    return true;
  }

  // ── Signal 3c: currentJourneyStatus + updatedAt (last resort) ───────────
  return (
    lead.currentJourneyStatus === "FOLLOW_UP_SCHEDULED" &&
    inRange(lead.updatedAt, from, to)
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<TeamOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
  const [dateTo, setDateTo] = useState(today());
  const [searchQuery, setSearchQuery] = useState("");

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
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await api.get("/manager/team-overview");
      setTeams(res.data?.data ?? res.data ?? []);
    } catch {
      // silent
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTeamOverview();
  }, [fetchData, fetchTeamOverview]);

  const stats = useMemo(() => {
    const poolLeads = leads.filter((l) => l.distributionStage === "L2_POOL");
    const assignedLeads = leads.filter(
      (l) => l.distributionStage === "AGENT_OWNED",
    );

    const connectedLeads = leads.filter((l) => {
      const convs = l.conversations ?? [];
      if (
        convs.some(
          (c) =>
            inRange(c.createdAt, dateFrom, dateTo) &&
            c.callDisposition != null &&
            CONNECTED_SET.has(c.callDisposition),
        )
      )
        return true;
      return (l.activities ?? []).some(
        (a) =>
          a.outcome === "CONNECTED" && inRange(a.calledAt, dateFrom, dateTo),
      );
    });

    const notConnectedLeads = leads.filter((l) => {
      const convs = (l.conversations ?? []).filter(
        (c) => c.type === "CALL_LOG" && inRange(c.createdAt, dateFrom, dateTo),
      );
      if (convs.length > 0) {
        if (
          convs.some(
            (c) =>
              c.callDisposition != null && CONNECTED_SET.has(c.callDisposition),
          )
        )
          return false;
        if (
          convs.every(
            (c) =>
              c.callDisposition != null &&
              NOT_CONNECTED_SET.has(c.callDisposition),
          )
        )
          return true;
      }
      const acts = (l.activities ?? []).filter((a) =>
        inRange(a.calledAt, dateFrom, dateTo),
      );
      return (
        acts.length > 0 && acts.every((a) => a.outcome === "NOT_CONNECTED")
      );
    });

    // ── Follow-ups ─────────────────────────────────────────────────────────
    // Uses the combined helper above. Each lead is evaluated once (no
    // double-counting). Checks: LeadFollowUp.followUpAt, Conversation.followUpDate,
    // and the FOLLOW_UP_SCHEDULED status transition via statusHistory /
    // conversation.statusAfter / currentJourneyStatus+updatedAt fallback.
    const followUpLeads = leads.filter((l) =>
      isFollowUpInRange(l, dateFrom, dateTo),
    );

    const BOOKED_STATUSES = new Set([
      "QUALIFIED",
      "INTERESTED",
      "NEGOTIATION",
      "DOCUMENTATION_PENDING",
      "MEETING_SCHEDULED",
    ]);
    const bookedLeads = leads.filter((l) => {
      const history = l.statusHistory ?? [];
      if (history.length > 0) {
        return history.some(
          (s) =>
            inRange(s.createdAt, dateFrom, dateTo) &&
            BOOKED_STATUSES.has(s.toStatus),
        );
      }
      const convs = l.conversations ?? [];
      if (
        convs.some(
          (c) =>
            inRange(c.createdAt, dateFrom, dateTo) &&
            c.statusAfter != null &&
            BOOKED_STATUSES.has(c.statusAfter),
        )
      )
        return true;
      return (
        BOOKED_STATUSES.has(l.currentJourneyStatus ?? "") &&
        inRange(l.updatedAt, dateFrom, dateTo)
      );
    });

    const convertedLeads = leads.filter((l) => {
      const history = l.statusHistory ?? [];
      if (history.length > 0) {
        return history.some(
          (s) =>
            inRange(s.createdAt, dateFrom, dateTo) &&
            s.toStatus === "CONVERTED",
        );
      }
      const convs = l.conversations ?? [];
      if (
        convs.some(
          (c) =>
            inRange(c.createdAt, dateFrom, dateTo) &&
            c.statusAfter === "CONVERTED",
        )
      )
        return true;
      return (
        l.currentJourneyStatus === "CONVERTED" &&
        inRange(l.updatedAt, dateFrom, dateTo)
      );
    });

    return {
      poolCount: poolLeads.length,
      assignedCount: assignedLeads.length,
      agentCount: agents.length,
      connected: connectedLeads.length,
      notConnected: notConnectedLeads.length,
      followUp: followUpLeads.length,
      booked: bookedLeads.length,
      converted: convertedLeads.length,
    };
  }, [leads, agents, dateFrom, dateTo]);

  const applyPreset = (days: number) => {
    const todayStr = today();
    if (days === -1) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      setDateFrom(yestStr);
      setDateTo(yestStr);
    } else if (days === 0) {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else {
      const from = new Date();
      from.setDate(from.getDate() - days);
      setDateFrom(from.toISOString().slice(0, 10));
      setDateTo(todayStr);
    }
  };

  const cards: StatCardProps[] = [
    {
      label: "Team Pool",
      value: stats.poolCount,
      sub: "Leads awaiting assignment",
      accent: "bg-blue-500",
      icon: <IconStack />,
    },
    {
      label: "Agent Assigned",
      value: stats.assignedCount,
      sub: "Leads owned by agents",
      accent: "bg-emerald-500",
      icon: <IconUserCheck />,
    },
    {
      label: "Total Agents",
      value: stats.agentCount,
      sub: "In your team",
      accent: "bg-indigo-500",
      icon: <IconUsers />,
    },
    {
      label: "Connected",
      value: stats.connected,
      sub: `${formatDate(dateFrom)} – ${formatDate(dateTo)}`,
      accent: "bg-green-500",
      icon: <IconCheck />,
    },
    {
      label: "Not Connected",
      value: stats.notConnected,
      sub: "Leads with no answer",
      accent: "bg-red-500",
      icon: <IconX />,
    },
    {
      label: "Follow-ups",
      value: stats.followUp,
      sub: "Scheduled in period",
      accent: "bg-orange-500",
      icon: <IconClock />,
    },
    {
      label: "Booked Sessions",
      value: stats.booked,
      sub: "Qualified / In negotiation",
      accent: "bg-purple-500",
      icon: <IconCalendar />,
    },
    {
      label: "Converted",
      value: stats.converted,
      sub: "Closed leads in period",
      accent: "bg-yellow-500",
      icon: <IconTrophy />,
    },
  ];

  const filteredTeams = useMemo(() => {
    const dateFilteredTeams = teams.map((team) =>
      filterTeamTimelineByDateRange(team, dateFrom, dateTo),
    );

    if (!searchQuery.trim()) return dateFilteredTeams;
    const q = searchQuery.toLowerCase();
    return dateFilteredTeams
      .map((team) => ({
        ...team,
        members: team.members
          .map((agent) => ({
            ...agent,
            leads: agent.leads.filter(
              (l) =>
                l.name?.toLowerCase().includes(q) ||
                l.phone?.toLowerCase().includes(q) ||
                (l.data &&
                  Object.values(l.data).some((v) =>
                    String(v).toLowerCase().includes(q),
                  )),
            ),
          }))
          .filter(
            (agent) =>
              agent.email.toLowerCase().includes(q) ||
              agent.designation.toLowerCase().includes(q) ||
              agent.leads.length > 0,
          ),
        poolLeads: team.poolLeads.filter(
          (l) =>
            l.name?.toLowerCase().includes(q) ||
            l.phone?.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (team) =>
          team.name.toLowerCase().includes(q) ||
          team.members.length > 0 ||
          team.poolLeads.length > 0,
      );
  }, [teams, searchQuery, dateFrom, dateTo]);

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
          Manager Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Overview of your team's pipeline and activity
        </p>
      </div>

      {/* Date-range filter */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            <span>Date Range</span>
            <span className="text-xs font-normal text-slate-400">
              {formatDate(dateFrom)} – {formatDate(dateTo)}
            </span>
          </span>
          <span
            className={`text-slate-400 transition-transform duration-200 ${filterOpen ? "rotate-180" : ""}`}
          >
            <IconChevronDown />
          </span>
        </button>

        {filterOpen && (
          <div className="border-t border-slate-100 px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Today", days: 0 },
                { label: "Yesterday", days: -1 },
                { label: "Last 7 days", days: 7 },
                { label: "Last 30 days", days: 30 },
                { label: "Last 90 days", days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyPreset(days)}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Tip: extend "To" past today to include upcoming scheduled
              follow-ups.
            </p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-100 shadow-sm h-24 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      {!loading && (
        <p className="text-[11px] text-slate-400 text-right">
          Activity stats for {formatDate(dateFrom)}
          {dateFrom !== dateTo ? ` – ${formatDate(dateTo)}` : ""}
          &nbsp;·&nbsp;
          {
            leads.filter(
              (l) =>
                inRange(l.createdAt, dateFrom, dateTo) ||
                (l.conversations ?? []).some((c) =>
                  inRange(c.createdAt, dateFrom, dateTo),
                ) ||
                (l.followUps ?? []).some((f) =>
                  inRange(f.followUpAt, dateFrom, dateTo),
                ) ||
                (l.statusHistory ?? []).some((s) =>
                  inRange(s.createdAt, dateFrom, dateTo),
                ),
            ).length
          }{" "}
          leads with activity in period
        </p>
      )}

      {/* Team Pipeline */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87M12 12a4 4 0 100-8 4 4 0 000 8z"
                />
              </svg>
              Team Pipeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All agents' assigned leads — conversation history shown for{" "}
              <span className="font-medium text-slate-600">
                {formatDate(dateFrom)} – {formatDate(dateTo)}
              </span>
            </p>
          </div>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search leads, agents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 h-9 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={fetchTeamOverview}
            disabled={overviewLoading}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${overviewLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {overviewLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            {searchQuery ? (
              <>
                <p className="text-slate-500 font-medium">
                  No results for "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">👥</p>
                <p className="text-slate-600 font-medium">No teams found</p>
                <p className="text-slate-400 text-sm mt-1">
                  Create a team and add agents to see their pipeline here
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTeams.map((team, idx) => (
              <TeamPanel
                key={team.id}
                team={team}
                defaultOpen={idx === 0}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
