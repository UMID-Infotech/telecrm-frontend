// telecrm/app/manager/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

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
  data?: Record<string, any>;
  activities?: Array<{
    id: string;
    callType: string;
    outcome: "CONNECTED" | "NOT_CONNECTED";
    calledAt: string;
  }>;
  followUps?: Array<{
    id: string;
    followUpAt: string;
    status: string;
  }>;
}

interface Agent {
  id: string;
  email: string;
  designation: string;
  isActive: boolean;
  activeTicketLimit: number;
  _count: { assignedLeads: number };
}

// ── date helpers ──────────────────────────────────────────────────────────────
const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const inRange = (
  iso: string | undefined,
  from: string,
  to: string,
): boolean => {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= from && d <= to;
};

// ── stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent: string; // tailwind bg class for the top stripe
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-w-0">
      {/* accent stripe */}
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

// ── icons (inline SVG, no dep) ────────────────────────────────────────────────
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
const IconCheckCircle = () => (
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
const IconXCircle = () => (
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

// ── main page ─────────────────────────────────────────────────────────────────
export default function ManagerDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
  const [dateTo, setDateTo] = useState(today());

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
      // silent — dashboard is best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const poolLeads = leads.filter((l) => l.distributionStage === "L2_POOL");
    const assignedLeads = leads.filter(
      (l) => l.distributionStage === "AGENT_OWNED",
    );

    // For activity-based stats we filter by the date range using lead createdAt
    // or activity calledAt (fall back to lead createdAt).
    const rangedLeads = leads.filter((l) =>
      inRange(l.createdAt, dateFrom, dateTo),
    );

    // Connected: leads where at least one activity has outcome CONNECTED in range
    const connectedLeads = rangedLeads.filter((l) =>
      (l.activities ?? []).some(
        (a) =>
          a.outcome === "CONNECTED" && inRange(a.calledAt, dateFrom, dateTo),
      ),
    );

    // Not connected: leads in range where ALL activities are NOT_CONNECTED (and has at least one)
    const notConnectedLeads = rangedLeads.filter((l) => {
      const acts = (l.activities ?? []).filter((a) =>
        inRange(a.calledAt, dateFrom, dateTo),
      );
      return (
        acts.length > 0 && acts.every((a) => a.outcome === "NOT_CONNECTED")
      );
    });

    // Follow-ups scheduled in range
    const followUpLeads = rangedLeads.filter((l) =>
      (l.followUps ?? []).some((f) => inRange(f.followUpAt, dateFrom, dateTo)),
    );

    // Booked session = QUALIFIED or INTERESTED status in range (interpreted as "session booked")
    const bookedLeads = rangedLeads.filter(
      (l) =>
        l.currentJourneyStatus === "QUALIFIED" ||
        l.currentJourneyStatus === "INTERESTED" ||
        l.currentJourneyStatus === "NEGOTIATION",
    );

    // Converted (revenue) in range
    const convertedLeads = rangedLeads.filter(
      (l) => l.currentJourneyStatus === "CONVERTED",
    );

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

  // ── quick preset ─────────────────────────────────────────────────────────
  const applyPreset = (days: number) => {
    const d = new Date();
    const from = new Date();
    from.setDate(d.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(d.toISOString().slice(0, 10));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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
      sub: `${dateFrom === dateTo ? formatDate(dateFrom) : `${formatDate(dateFrom)} – ${formatDate(dateTo)}`}`,
      accent: "bg-green-500",
      icon: <IconCheckCircle />,
    },
    {
      label: "Not Connected",
      value: stats.notConnected,
      sub: "Leads with no answer",
      accent: "bg-red-500",
      icon: <IconXCircle />,
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

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── page heading ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
          Manager Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Overview of your team's pipeline and activity
        </p>
      </div>

      {/* ── date-range filter ── */}
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
            {/* quick presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Today", days: 0 },
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

            {/* custom range */}
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
                  max={today()}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── stat cards ── */}
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

      {/* ── section divider label ── */}
      {!loading && (
        <p className="text-[11px] text-slate-400 text-right">
          Activity stats for {formatDate(dateFrom)}
          {dateFrom !== dateTo ? ` – ${formatDate(dateTo)}` : ""}
          &nbsp;·&nbsp;
          {
            leads.filter((l) => inRange(l.createdAt, dateFrom, dateTo)).length
          }{" "}
          leads in period
        </p>
      )}
    </div>
  );
}
