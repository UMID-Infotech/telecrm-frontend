// teleCRM/components/agent/for-mobile/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  MessageCircle,
  Phone,
  XCircle,
  FileText,
  TrendingUp,
  FileCheck2,
  CalendarRange,
  Volume2,
  PhoneOff,
  PhoneMissed,
  PhoneCall,
  Paperclip,
  Plus,
  X,
  ChevronRight,
  Info,
  Target,
  Activity,
  Users,
  Sparkles,
} from "lucide-react";
import { ConversionDialog } from "./conversion-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationType =
  | "CALL_LOG"
  | "FOLLOW_UP_NOTE"
  | "WHATSAPP_INTERACTION"
  | "SMS_LOG"
  | "EMAIL_ACTIVITY"
  | "INTERNAL_NOTE"
  | "MEETING_SCHEDULED"
  | "SITE_VISIT"
  | "STATUS_CHANGE"
  | "REASSIGNMENT_ACTIVITY";

type CallDisposition =
  | "CONNECTED"
  | "NOT_REACHABLE"
  | "SWITCHED_OFF"
  | "BUSY"
  | "WRONG_NUMBER"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALLBACK_REQUESTED"
  | "FOLLOW_UP_REQUIRED"
  | "CONVERTED";

type LeadJourneyStatus =
  | "FRESH_LEAD"
  | "ATTEMPTED_CONTACT"
  | "CONNECTED"
  | "QUALIFIED"
  | "INTERESTED"
  | "FOLLOW_UP_SCHEDULED"
  | "NEGOTIATION"
  | "DOCUMENTATION_PENDING"
  | "CONVERTED"
  | "LOST"
  | "NOT_INTERESTED"
  | "DUPLICATE"
  | "INVALID_LEAD";

interface LeadAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

interface LeadConversation {
  id: string;
  type: ConversationType;
  notes?: string | null;
  callDisposition?: CallDisposition | null;
  callDuration?: number | null;
  recordingUrl?: string | null;
  followUpDate?: string | null;
  nextAction?: string | null;
  statusBefore?: LeadJourneyStatus | null;
  statusAfter?: LeadJourneyStatus | null;
  createdAt: string;
  agent: { id: string; email: string; designation: string };
  attachments?: LeadAttachment[];
}

interface LeadFollowUp {
  id: string;
  followUpAt: string;
  notes?: string | null;
  status: "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";
}

interface LeadStatusHistory {
  id: string;
  fromStatus: LeadJourneyStatus;
  toStatus: LeadJourneyStatus;
  remarks?: string | null;
  createdAt: string;
  changedBy: { email: string; designation: string };
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  distributionStage: "L1_POOL" | "L2_POOL" | "AGENT_OWNED" | null;
  currentJourneyStatus: LeadJourneyStatus;
  data?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  assignedToUser?: { email: string; designation: string } | null;
  team?: { name: string } | null;
  conversations: LeadConversation[];
  followUps: LeadFollowUp[];
  statusHistory: LeadStatusHistory[];
  attachments?: LeadAttachment[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const pipelineStages: { status: LeadJourneyStatus; label: string }[] = [
  { status: "FRESH_LEAD", label: "Fresh" },
  { status: "ATTEMPTED_CONTACT", label: "Attempted" },
  { status: "CONNECTED", label: "Connected" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "INTERESTED", label: "Interested" },
  { status: "FOLLOW_UP_SCHEDULED", label: "Follow-Up" },
  { status: "NEGOTIATION", label: "Negotiation" },
  { status: "DOCUMENTATION_PENDING", label: "Docs" },
  { status: "CONVERTED", label: "Converted" },
  { status: "LOST", label: "Lost" },
];

const priorityConfig: Record<Lead["priority"], { cls: string; dot: string }> = {
  HIGH: { cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  MEDIUM: { cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  LOW: { cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

const conversationTypeLabel: Record<ConversationType, string> = {
  CALL_LOG: "Call Logged",
  FOLLOW_UP_NOTE: "Follow-Up Note",
  WHATSAPP_INTERACTION: "WhatsApp Chat",
  SMS_LOG: "SMS Logged",
  EMAIL_ACTIVITY: "Email",
  INTERNAL_NOTE: "Internal Note",
  MEETING_SCHEDULED: "Meeting Set",
  SITE_VISIT: "Site Visit",
  STATUS_CHANGE: "Status Changed",
  REASSIGNMENT_ACTIVITY: "Reassigned",
};

const dispositionConfig: Record<
  CallDisposition,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  CONNECTED: {
    label: "Connected",
    cls: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 size={11} />,
  },
  NOT_REACHABLE: {
    label: "Not Reachable",
    cls: "bg-rose-50 text-rose-700",
    icon: <PhoneOff size={11} />,
  },
  SWITCHED_OFF: {
    label: "Switched Off",
    cls: "bg-rose-50 text-rose-700",
    icon: <PhoneOff size={11} />,
  },
  BUSY: {
    label: "Busy",
    cls: "bg-amber-50 text-amber-700",
    icon: <PhoneMissed size={11} />,
  },
  WRONG_NUMBER: {
    label: "Wrong Number",
    cls: "bg-slate-100 text-slate-700",
    icon: <XCircle size={11} />,
  },
  INTERESTED: {
    label: "Interested",
    cls: "bg-blue-50 text-blue-700",
    icon: <TrendingUp size={11} />,
  },
  NOT_INTERESTED: {
    label: "Not Interested",
    cls: "bg-rose-50 text-rose-700",
    icon: <XCircle size={11} />,
  },
  CALLBACK_REQUESTED: {
    label: "Callback",
    cls: "bg-purple-50 text-purple-700",
    icon: <PhoneCall size={11} />,
  },
  FOLLOW_UP_REQUIRED: {
    label: "Follow-Up",
    cls: "bg-indigo-50 text-indigo-700",
    icon: <CalendarClock size={11} />,
  },
  CONVERTED: {
    label: "Converted",
    cls: "bg-teal-50 text-teal-700",
    icon: <TrendingUp size={11} />,
  },
};

const callDispositionFormOptions: { value: CallDisposition; label: string }[] =
  [
    { value: "CONNECTED", label: "Connected" },
    { value: "NOT_REACHABLE", label: "Not Reachable" },
    { value: "SWITCHED_OFF", label: "Switched Off" },
    { value: "BUSY", label: "Busy" },
    { value: "WRONG_NUMBER", label: "Wrong Number" },
    { value: "INTERESTED", label: "Interested" },
    { value: "NOT_INTERESTED", label: "Not Interested" },
    { value: "CALLBACK_REQUESTED", label: "Callback Requested" },
    { value: "FOLLOW_UP_REQUIRED", label: "Follow-Up Required" },
  ];

const isConnectedDisposition = (d: CallDisposition) =>
  [
    "CONNECTED",
    "INTERESTED",
    "CALLBACK_REQUESTED",
    "FOLLOW_UP_REQUIRED",
  ].includes(d);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatJourneyStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().+]/g, "");
  if (digits.length === 10 && !digits.startsWith("0")) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition select-none"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-600 shrink-0">
          {icon}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[15px] font-bold text-slate-900 leading-tight truncate">
            {title}
          </p>
        </div>
        {badge}
        <ChevronDown
          size={18}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-slate-100 p-4">{children}</div>}
    </div>
  );
}

// ─── Activity Entry ───────────────────────────────────────────────────────────

function ActivityEntry({ conversation }: { conversation: LeadConversation }) {
  const disp = conversation.callDisposition;
  const dispCfg = disp ? dispositionConfig[disp] : null;

  const iconBg =
    disp === "CONNECTED" || disp === "INTERESTED"
      ? "bg-emerald-500 text-white"
      : disp && !isConnectedDisposition(disp)
        ? "bg-rose-500 text-white"
        : conversation.type === "WHATSAPP_INTERACTION"
          ? "bg-teal-500 text-white"
          : conversation.type === "STATUS_CHANGE"
            ? "bg-amber-500 text-white"
            : conversation.type === "FOLLOW_UP_NOTE"
              ? "bg-purple-500 text-white"
              : "bg-blue-500 text-white";

  const getIcon = () => {
    if (conversation.type === "CALL_LOG") return <Phone size={14} />;
    if (conversation.type === "WHATSAPP_INTERACTION")
      return <MessageCircle size={14} />;
    if (conversation.type === "FOLLOW_UP_NOTE")
      return <CalendarClock size={14} />;
    if (conversation.type === "STATUS_CHANGE") return <TrendingUp size={14} />;
    if (conversation.type === "INTERNAL_NOTE")
      return <ClipboardList size={14} />;
    if (conversation.type === "MEETING_SCHEDULED")
      return <CalendarRange size={14} />;
    return <ClipboardList size={14} />;
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-9 h-9 rounded-full grid place-items-center shrink-0 shadow-sm ${iconBg}`}
        >
          {getIcon()}
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1.5 last:hidden" />
      </div>

      <div className="pb-5 flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900">
              {conversationTypeLabel[conversation.type] ?? conversation.type}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
              {formatRelative(conversation.createdAt)}
            </span>
          </div>

          {dispCfg && (
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${dispCfg.cls}`}
              >
                {dispCfg.icon} {dispCfg.label}
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 font-semibold mt-1.5 truncate">
            by {conversation.agent.email.split("@")[0]} ·{" "}
            {conversation.agent.designation}
          </p>

          {conversation.notes && (
            <p className="mt-2 text-sm text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 break-words">
              {conversation.notes}
            </p>
          )}

          {conversation.callDuration != null && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                <Clock size={11} /> {conversation.callDuration}s
              </span>
              {conversation.recordingUrl && (
                <a
                  href={conversation.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 active:bg-slate-200 px-2 py-0.5 rounded-full"
                >
                  <Volume2 size={11} /> Recording
                </a>
              )}
            </div>
          )}

          {conversation.nextAction && (
            <div className="mt-2 text-xs text-slate-700 bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-1.5 break-words">
              <span className="font-bold text-blue-700">Next: </span>
              {conversation.nextAction}
            </div>
          )}

          {conversation.followUpDate && (
            <div className="mt-2 text-xs text-purple-700 bg-purple-50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold">
              <CalendarClock size={11} /> Callback:{" "}
              {formatDateTime(conversation.followUpDate)}
            </div>
          )}

          {conversation.statusAfter && (
            <div className="mt-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 inline-flex flex-wrap rounded-full px-2.5 py-1 gap-1">
              <span>
                {conversation.statusBefore
                  ? formatJourneyStatus(conversation.statusBefore)
                  : "Fresh"}{" "}
                →{" "}
                <span className="underline">
                  {formatJourneyStatus(conversation.statusAfter)}
                </span>
              </span>
            </div>
          )}

          {conversation.attachments && conversation.attachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {conversation.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 active:bg-slate-200 px-2 py-1 rounded-full max-w-full"
                >
                  <Paperclip size={10} className="shrink-0" />
                  <span className="truncate">{att.fileName}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const { showToast, ToastComponent } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Composer (bottom sheet)
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<
    "call" | "whatsapp" | "followup" | "note"
  >("call");
  const [actionLoading, setActionLoading] = useState(false);

  const [callDisposition, setCallDisposition] =
    useState<CallDisposition>("CONNECTED");
  const [callNotes, setCallNotes] = useState("");
  const [callDuration, setCallDuration] = useState<string>("45");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [nextAction, setNextAction] = useState("");

  const [waNotes, setWaNotes] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [fDate, setFDate] = useState("");
  const [fNotes, setFNotes] = useState("");

  // Pipeline transitions
  const [transitionStatus, setTransitionStatus] =
    useState<LeadJourneyStatus | null>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [pipelineSheetOpen, setPipelineSheetOpen] = useState(false);

  // Reschedule
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleFollowUpId, setRescheduleFollowUpId] = useState<
    string | null
  >(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/agent/lead/${leadId}`);
      setLead(res.data);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to load lead details",
        "destructive",
      );
      router.push("/agent/leads");
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // ── Submit handlers (UNCHANGED logic) ─────────────────────────────────────

  const submitCallLog = async () => {
    if (!lead) return;
    setActionLoading(true);
    try {
      const statusAfter = isConnectedDisposition(callDisposition)
        ? "CONNECTED"
        : "ATTEMPTED_CONTACT";
      await api.post("/agent/conversation", {
        leadId: lead.id,
        type: "CALL_LOG",
        callDisposition,
        callDuration: isConnectedDisposition(callDisposition)
          ? parseInt(callDuration) || 0
          : undefined,
        recordingUrl: recordingUrl.trim() || undefined,
        notes: callNotes.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        statusAfter,
      });
      showToast("Call logged successfully", "success");
      setCallNotes("");
      setCallDuration("45");
      setRecordingUrl("");
      setNextAction("");
      setComposerOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to log call",
        "destructive",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const submitWhatsAppLog = async () => {
    if (!lead) return;
    if (!waNotes.trim()) {
      showToast(
        "Please add notes about the WhatsApp conversation",
        "destructive",
      );
      return;
    }
    setActionLoading(true);
    try {
      await api.post("/agent/conversation", {
        leadId: lead.id,
        type: "WHATSAPP_INTERACTION",
        callDisposition: "CONNECTED",
        notes: waNotes.trim(),
        statusAfter: "CONNECTED",
      });
      showToast("WhatsApp interaction logged successfully", "success");
      setWaNotes("");
      setComposerOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to log WhatsApp interaction",
        "destructive",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const submitInternalNote = async () => {
    if (!lead) return;
    if (!internalNote.trim()) {
      showToast("Please write content for the internal note", "destructive");
      return;
    }
    setActionLoading(true);
    try {
      await api.post("/agent/conversation", {
        leadId: lead.id,
        type: "INTERNAL_NOTE",
        notes: internalNote.trim(),
      });
      showToast("Internal note saved successfully", "success");
      setInternalNote("");
      setComposerOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to create internal note",
        "destructive",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const submitScheduleFollowUp = async () => {
    if (!lead || !fDate) return;
    setActionLoading(true);
    try {
      await api.post("/agent/followup", {
        leadId: lead.id,
        followUpAt: new Date(fDate).toISOString(),
        notes: fNotes.trim() || undefined,
      });
      showToast("Follow-up scheduled successfully", "success");
      setFDate("");
      setFNotes("");
      setComposerOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to schedule follow-up",
        "destructive",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const completeFollowUp = async (followupId: string) => {
    try {
      await api.patch(`/agent/followup/${followupId}`, {
        status: "COMPLETED",
        notes: "Follow-up resolved by agent.",
      });
      showToast("Follow-up marked as completed", "success");
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to complete follow-up",
        "destructive",
      );
    }
  };

  const openRescheduleModal = (f: LeadFollowUp) => {
    setRescheduleFollowUpId(f.id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setRescheduleDate(tomorrow.toISOString().slice(0, 16));
    setRescheduleNotes(f.notes ?? "");
    setRescheduleOpen(true);
  };

  const submitRescheduleFollowUp = async () => {
    if (!rescheduleFollowUpId || !rescheduleDate) return;
    setRescheduleLoading(true);
    try {
      await api.patch(`/agent/followup/${rescheduleFollowUpId}`, {
        status: "RESCHEDULED",
        followUpAt: new Date(rescheduleDate).toISOString(),
        notes: rescheduleNotes.trim() || undefined,
      });
      showToast("Follow-up rescheduled successfully", "success");
      setRescheduleOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to reschedule follow-up",
        "destructive",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handlePipelineStepClick = (status: LeadJourneyStatus) => {
    if (!lead || lead.currentJourneyStatus === status) return;
    setPipelineSheetOpen(false);
    if (
      status === "CONVERTED" ||
      status === "LOST" ||
      status === "NOT_INTERESTED"
    ) {
      setTransitionStatus(status);
    } else {
      setTransitionStatus(status);
      setStatusRemarks("");
      setStatusConfirmOpen(true);
    }
  };

  const submitStandardStatusChange = async () => {
    if (!lead || !transitionStatus) return;
    setStatusChangeLoading(true);
    try {
      await api.post("/agent/conversation", {
        leadId: lead.id,
        type: "STATUS_CHANGE",
        statusAfter: transitionStatus,
        notes:
          statusRemarks.trim() ||
          `Status updated to ${formatJourneyStatus(transitionStatus)}`,
      });
      showToast("Pipeline updated successfully", "success");
      setStatusConfirmOpen(false);
      fetchLead();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to transition pipeline",
        "destructive",
      );
    } finally {
      setStatusChangeLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">
          Retrieving lead journey...
        </p>
      </div>
    );
  }
  if (!lead) return null;

  const leadPriorityObj = priorityConfig[lead.priority];
  const canCall =
    lead.distributionStage === "AGENT_OWNED" &&
    lead.approvalStatus === "APPROVED";
  const pendingFollowUps = (lead.followUps ?? []).filter(
    (f) => f.status === "PENDING",
  );

  const lData = lead.data || {};
  const email = lData.email ?? "Not Available";
  const city = lData.city ?? lData.state ?? lData.cityState ?? "Not Provided";
  const campaignSource =
    lData.campaignSource ?? lData.source ?? "External Input";
  const campaignMedium = lData.campaignMedium ?? lData.medium ?? "Direct Form";
  const productInterested =
    lData.productInterestedIn ?? lData.product ?? "Starter Pack";
  const uploadedDocs = lData.documents ?? lData.uploadedDocuments ?? [];

  const normalisedPhone = normalisePhone(lead.phone);
  const telHref = `tel:${normalisedPhone}`;
  const waHref = `https://wa.me/${normalisedPhone.replace("+", "")}`;

  const currentIdx = pipelineStages.findIndex(
    (s) => s.status === lead.currentJourneyStatus,
  );
  const pipelineProgress =
    currentIdx >= 0
      ? Math.round(((currentIdx + 1) / pipelineStages.length) * 100)
      : 5;

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-x-hidden">
      {ToastComponent}

      {/* ── Sticky Top Bar ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200
                   pt-[max(env(safe-area-inset-top),0px)]"
      >
        <div className="flex items-center gap-2 px-3 py-2.5 max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/agent/leads")}
            className="w-10 h-10 grid place-items-center rounded-full active:bg-slate-100 text-slate-700 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Lead
            </p>
            <p className="text-[15px] font-bold text-slate-900 truncate leading-tight mt-0.5">
              {lead.name}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${leadPriorityObj.cls} shrink-0`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${leadPriorityObj.dot}`}
            />
            {lead.priority}
          </span>
        </div>
      </header>

      {/* ── Main scrollable area ───────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-4 pb-40 space-y-4">
        {/* ── Identity Card ─────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg shadow-blue-600/20">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-xl font-black shrink-0">
              {initialsOf(lead.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight leading-tight break-words">
                {lead.name}
              </h1>
              <p className="font-mono text-sm text-blue-100 mt-0.5">
                {lead.phone}
              </p>
              {email && email !== "Not Available" && (
                <p className="text-xs text-blue-200 mt-0.5 truncate">{email}</p>
              )}
            </div>
          </div>

          {/* Status pill */}
          <div className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-3 py-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
            <div className="text-xs min-w-0 flex-1">
              <p className="text-blue-200 font-semibold uppercase tracking-wider text-[9px] leading-none">
                Current Status
              </p>
              <p className="text-white font-bold mt-0.5 text-[13px] truncate">
                {formatJourneyStatus(lead.currentJourneyStatus)}
              </p>
            </div>
            {lead.approvalStatus === "PENDING" && (
              <span className="bg-amber-300 text-amber-900 text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0">
                Pending
              </span>
            )}
          </div>

          {/* Quick contact buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <a
              href={telHref}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white text-blue-700 font-bold shadow-md active:scale-[0.98] transition select-none"
            >
              <Phone size={18} />
              <span>Call</span>
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#25D366] text-white font-bold shadow-md active:scale-[0.98] transition select-none"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </a>
          </div>
        </section>

        {/* ── Pipeline progress (compact, opens sheet) ──────────────────── */}
        <button
          disabled={!canCall}
          onClick={() => setPipelineSheetOpen(true)}
          className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm text-left disabled:opacity-70 active:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target size={16} className="text-blue-600 shrink-0" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sales Pipeline
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 shrink-0">
              {currentIdx + 1}/{pipelineStages.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${pipelineProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">
              {formatJourneyStatus(lead.currentJourneyStatus)}
            </p>
            {canCall && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 shrink-0">
                Change <ChevronRight size={14} />
              </span>
            )}
          </div>
        </button>

        {/* ── Pending callbacks (high priority) ─────────────────────────── */}
        {pendingFollowUps.length > 0 && (
          <section className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-purple-100 bg-purple-100/40 flex items-center gap-2">
              <CalendarRange size={16} className="text-purple-700" />
              <p className="text-sm font-bold text-purple-900">
                Pending Callbacks ({pendingFollowUps.length})
              </p>
            </div>
            <div className="p-3 space-y-2.5">
              {pendingFollowUps.map((f) => (
                <div
                  key={f.id}
                  className="bg-white rounded-xl border border-purple-100 p-3 shadow-sm"
                >
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <Clock size={13} className="text-purple-500 shrink-0" />
                    {formatDateTime(f.followUpAt)}
                  </p>
                  {f.notes && (
                    <p className="text-xs text-slate-600 mt-1 break-words">
                      {f.notes}
                    </p>
                  )}
                  {canCall && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => completeFollowUp(f.id)}
                        className="flex-1 h-10 rounded-xl bg-purple-600 active:bg-purple-700 text-white text-xs font-bold transition"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => openRescheduleModal(f)}
                        className="flex-1 h-10 rounded-xl border border-purple-200 text-purple-700 text-xs font-bold active:bg-purple-50 transition"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Activity Timeline ─────────────────────────────────────────── */}
        <section className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-600" />
              <p className="text-sm font-bold text-slate-900">
                Activity Timeline
              </p>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 font-bold">
              {lead.conversations.length}
            </span>
          </div>
          <div className="p-4">
            {lead.conversations.length === 0 ? (
              <div className="text-center py-10">
                <Sparkles size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  No activity yet
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Tap the <span className="font-bold text-blue-600">+</span>{" "}
                  button below to log your first call, message, or note.
                </p>
              </div>
            ) : (
              <div>
                {lead.conversations.map((c) => (
                  <ActivityEntry key={c.id} conversation={c} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Collapsible Details ───────────────────────────────────────── */}
        <Section icon={<Info size={16} />} title="Lead Details">
          <dl className="space-y-3">
            {[
              { label: "Name", value: lead.name },
              { label: "Mobile", value: lead.phone },
              { label: "Email", value: email },
              { label: "City / State", value: city },
              { label: "Created", value: formatDateTime(lead.createdAt) },
            ].map((row) => (
              <div
                key={row.label}
                className="border-b border-slate-50 pb-2 last:border-0 last:pb-0"
              >
                <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {row.label}
                </dt>
                <dd className="text-sm font-semibold text-slate-800 break-words mt-0.5">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={<TrendingUp size={16} />} title="Campaign & Source">
          <dl className="space-y-3">
            {[
              { label: "Source", value: campaignSource },
              { label: "Medium", value: campaignMedium },
              { label: "Product Interested", value: productInterested },
              {
                label: "Campaign Name",
                value: lData.campaignName ?? "Direct Inquiry",
              },
              { label: "Ad Name", value: lData.adName ?? "Main Headline" },
            ].map((row) => (
              <div
                key={row.label}
                className="border-b border-slate-50 pb-2 last:border-0 last:pb-0"
              >
                <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {row.label}
                </dt>
                <dd className="text-sm font-semibold text-slate-800 break-words mt-0.5">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={<Users size={16} />} title="Assignment">
          <dl className="space-y-3">
            {[
              { label: "Team", value: lead.team?.name ?? "General CRM Team" },
              {
                label: "Assigned Agent",
                value: lead.assignedToUser?.email.split("@")[0] ?? "Unassigned",
              },
              {
                label: "Designation",
                value: lead.assignedToUser?.designation ?? "—",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="border-b border-slate-50 pb-2 last:border-0 last:pb-0"
              >
                <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {row.label}
                </dt>
                <dd className="text-sm font-semibold text-slate-800 break-words mt-0.5">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          icon={<FileText size={16} />}
          title="Documents"
          badge={
            <span className="text-[11px] bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 font-bold">
              {(lead.attachments?.length ?? 0) +
                (Array.isArray(uploadedDocs) ? uploadedDocs.length : 0)}
            </span>
          }
        >
          {(lead.attachments ?? []).length > 0 ? (
            <div className="space-y-2">
              {(lead.attachments ?? []).map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl active:bg-slate-100 transition"
                >
                  <FileText size={18} className="text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate flex-1 min-w-0">
                    {att.fileName}
                  </span>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </a>
              ))}
            </div>
          ) : Array.isArray(uploadedDocs) && uploadedDocs.length > 0 ? (
            <div className="space-y-2">
              {uploadedDocs.map((doc: any, i: number) => (
                <a
                  key={i}
                  href={doc.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl active:bg-slate-100 transition"
                >
                  <FileText size={18} className="text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate flex-1 min-w-0">
                    {doc.name ?? `Document_${i + 1}`}
                  </span>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <FileText size={24} className="mx-auto text-slate-300 mb-1" />
              <p className="text-slate-400 text-xs font-medium">
                No documents attached.
              </p>
            </div>
          )}
        </Section>

        <Section icon={<CalendarRange size={16} />} title="Milestone Summary">
          <div className="relative pl-4 space-y-3 border-l-2 border-slate-100">
            <div className="relative">
              <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Created
              </p>
              <p className="text-xs font-semibold text-slate-700">
                {formatDateTime(lead.createdAt)}
              </p>
            </div>
            {lead.approvalStatus === "APPROVED" && (
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Approved
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  Ready in workspace
                </p>
              </div>
            )}
            {lData.conversionData && (
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow animate-pulse" />
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">
                  Converted
                </p>
                <p className="text-xs font-bold text-slate-800 break-words">
                  {lData.conversionData.productSelected} (₹
                  {lData.conversionData.conversionValue})
                </p>
              </div>
            )}
            {lData.closureData && (
              <div className="relative">
                <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow" />
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                  Closed
                </p>
                <p className="text-xs font-bold text-slate-800 break-words">
                  Reason: {lData.closureData.lossReason}
                </p>
              </div>
            )}
            {(lead.statusHistory ?? []).slice(0, 5).map((h) => (
              <div key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white shadow" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider break-words">
                  {formatJourneyStatus(h.fromStatus)} →{" "}
                  {formatJourneyStatus(h.toStatus)}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {formatDateTime(h.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </main>

      {/* ── Sticky Bottom Action Bar ─────────────────────────────────────── */}
      {canCall && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200
                     px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)]"
        >
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <a
              href={telHref}
              className="flex-1 h-12 rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-bold grid place-items-center shadow-md active:scale-[0.98] transition"
              aria-label="Call lead"
            >
              <span className="flex items-center gap-2">
                <Phone size={18} /> Call
              </span>
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 rounded-2xl bg-[#25D366] active:bg-[#1da34f] text-white font-bold grid place-items-center shadow-md active:scale-[0.98] transition"
              aria-label="WhatsApp lead"
            >
              <span className="flex items-center gap-2">
                <MessageCircle size={18} /> Chat
              </span>
            </a>
            <button
              onClick={() => setComposerOpen(true)}
              className="h-12 w-12 rounded-2xl bg-slate-900 active:bg-slate-800 text-white grid place-items-center shadow-md active:scale-[0.95] transition shrink-0"
              aria-label="Log activity"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      )}

      {/* ── Composer Bottom Sheet ────────────────────────────────────────── */}
      <Dialog
        open={composerOpen}
        onOpenChange={(o) => !actionLoading && setComposerOpen(o)}
      >
        <DialogContent
          className="
            p-0 gap-0 border-0 shadow-2xl overflow-hidden
            w-screen h-[92dvh] max-w-none
            rounded-t-3xl rounded-b-none
            !top-auto !bottom-0 !left-0 !translate-x-0 !translate-y-0
            sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2
            sm:rounded-2xl sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:h-auto sm:max-h-[88dvh]
            flex flex-col
          "
        >
          <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-200" />
          </div>

          <DialogHeader className="px-5 pt-2 pb-3 border-b text-left shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg font-extrabold text-slate-900">
                Log Activity
              </DialogTitle>
              <button
                onClick={() => !actionLoading && setComposerOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full active:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <DialogDescription className="sr-only">
              Log a call, message, or note
            </DialogDescription>
          </DialogHeader>

          {/* Tab strip */}
          <div className="px-3 pt-2 pb-3 border-b shrink-0 overflow-x-auto">
            <div className="flex gap-1.5 w-max min-w-full">
              {[
                {
                  id: "call" as const,
                  label: "Call",
                  icon: <Phone size={14} />,
                },
                {
                  id: "whatsapp" as const,
                  label: "WhatsApp",
                  icon: <MessageCircle size={14} />,
                },
                {
                  id: "followup" as const,
                  label: "Callback",
                  icon: <CalendarClock size={14} />,
                },
                {
                  id: "note" as const,
                  label: "Note",
                  icon: <ClipboardList size={14} />,
                },
              ].map((ft) => (
                <button
                  key={ft.id}
                  onClick={() => setActiveForm(ft.id)}
                  className={`px-4 h-10 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                    activeForm === ft.id
                      ? "bg-slate-900 text-white shadow"
                      : "bg-slate-100 text-slate-600 active:bg-slate-200"
                  }`}
                >
                  {ft.icon} {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {activeForm === "call" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Call Disposition
                  </Label>
                  <Select
                    value={callDisposition}
                    onValueChange={(v) =>
                      setCallDisposition(v as CallDisposition)
                    }
                  >
                    <SelectTrigger className="h-12 text-base rounded-xl w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {callDispositionFormOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isConnectedDisposition(callDisposition) && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Duration (seconds)
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={callDuration}
                        onChange={(e) => setCallDuration(e.target.value)}
                        className="h-12 text-base rounded-xl w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Recording URL{" "}
                        <span className="text-slate-400 font-medium normal-case">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="https://..."
                        value={recordingUrl}
                        onChange={(e) => setRecordingUrl(e.target.value)}
                        className="h-12 text-base rounded-xl w-full"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Notes
                  </Label>
                  <Textarea
                    placeholder="Log details from this call..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={4}
                    className="resize-none text-base rounded-xl w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Next Action{" "}
                    <span className="text-slate-400 font-medium normal-case">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Send proposal"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    className="h-12 text-base rounded-xl w-full"
                  />
                </div>
              </div>
            )}

            {activeForm === "whatsapp" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    WhatsApp Conversation
                  </Label>
                  <Textarea
                    placeholder="What did you discuss on WhatsApp?"
                    value={waNotes}
                    onChange={(e) => setWaNotes(e.target.value)}
                    rows={6}
                    className="resize-none text-base rounded-xl w-full"
                  />
                </div>
              </div>
            )}

            {activeForm === "followup" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Callback Date & Time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="h-12 text-base rounded-xl w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Purpose / Notes
                  </Label>
                  <Textarea
                    placeholder="What to discuss on the next call..."
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    rows={4}
                    className="resize-none text-base rounded-xl w-full"
                  />
                </div>
              </div>
            )}

            {activeForm === "note" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Internal Team Memo
                  </Label>
                  <Textarea
                    placeholder="Notes visible only to managers and admins..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={6}
                    className="resize-none text-base rounded-xl w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky submit */}
          <DialogFooter
            className="px-5 py-3 border-t bg-white shrink-0
                       pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          >
            <Button
              onClick={() => {
                if (activeForm === "call") submitCallLog();
                else if (activeForm === "whatsapp") submitWhatsAppLog();
                else if (activeForm === "followup") submitScheduleFollowUp();
                else submitInternalNote();
              }}
              disabled={actionLoading || (activeForm === "followup" && !fDate)}
              className={`w-full h-12 rounded-xl text-base font-bold text-white shadow-md active:scale-[0.99] transition ${
                activeForm === "call"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : activeForm === "whatsapp"
                    ? "bg-teal-600 hover:bg-teal-700"
                    : activeForm === "followup"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {actionLoading
                ? "Saving..."
                : activeForm === "call"
                  ? "Save Call"
                  : activeForm === "whatsapp"
                    ? "Save WhatsApp"
                    : activeForm === "followup"
                      ? "Set Callback"
                      : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pipeline Stage Picker Sheet ──────────────────────────────────── */}
      <Dialog open={pipelineSheetOpen} onOpenChange={setPipelineSheetOpen}>
        <DialogContent
          className="
            p-0 gap-0 border-0 shadow-2xl overflow-hidden
            w-screen h-auto max-h-[85dvh] max-w-none
            rounded-t-3xl rounded-b-none
            !top-auto !bottom-0 !left-0 !translate-x-0 !translate-y-0
            sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2
            sm:rounded-2xl sm:w-[calc(100vw-2rem)] sm:max-w-md sm:h-auto
            flex flex-col
          "
        >
          <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-200" />
          </div>
          <DialogHeader className="px-5 pt-2 pb-3 border-b text-left shrink-0">
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Move to Stage
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Pick the next stage for this lead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            {pipelineStages.map((stage, idx) => {
              const isCompleted = idx < currentIdx;
              const isActive = stage.status === lead.currentJourneyStatus;
              return (
                <button
                  key={stage.status}
                  disabled={isActive}
                  onClick={() => handlePipelineStepClick(stage.status)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isCompleted
                        ? "bg-blue-50 active:bg-blue-100 text-blue-800"
                        : "bg-slate-50 active:bg-slate-100 text-slate-800"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                      isActive
                        ? "bg-white/20"
                        : isCompleted
                          ? "bg-blue-200 text-blue-800"
                          : "bg-white text-slate-500 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? <FileCheck2 size={14} /> : idx + 1}
                  </span>
                  <span className="flex-1 font-bold text-sm">
                    {stage.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5">
                      Current
                    </span>
                  )}
                  {!isActive && (
                    <ChevronRight size={16} className="opacity-50 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Standard Status Change Modal ─────────────────────────────────── */}
      <Dialog
        open={statusConfirmOpen}
        onOpenChange={(o) => !o && setStatusConfirmOpen(false)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto border-slate-100 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg text-slate-800">
              <TrendingUp className="text-blue-500 w-5 h-5 shrink-0" /> Confirm
              Transition
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium break-words">
              Move lead to{" "}
              <strong className="text-blue-600 font-bold">
                {transitionStatus ? formatJourneyStatus(transitionStatus) : ""}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Remarks
            </Label>
            <Textarea
              placeholder="Why are you moving this lead?"
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              rows={3}
              className="resize-none rounded-xl w-full text-base"
            />
          </div>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              disabled={statusChangeLoading}
              onClick={() => setStatusConfirmOpen(false)}
              className="w-full sm:w-auto h-12 sm:h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={submitStandardStatusChange}
              disabled={statusChangeLoading}
              className="w-full sm:flex-1 h-12 sm:h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {statusChangeLoading ? "Transitioning..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Conversion / Closure Dialog ──────────────────────────────────── */}
      <ConversionDialog
        open={
          transitionStatus === "CONVERTED" ||
          transitionStatus === "LOST" ||
          transitionStatus === "NOT_INTERESTED"
        }
        onOpenChange={(o) => !o && setTransitionStatus(null)}
        status={
          transitionStatus === "CONVERTED" ||
          transitionStatus === "LOST" ||
          transitionStatus === "NOT_INTERESTED"
            ? transitionStatus
            : null
        }
        leadId={lead.id}
        leadName={lead.name}
        onSuccess={fetchLead}
      />

      {/* ── Reschedule Modal ─────────────────────────────────────────────── */}
      <Dialog
        open={rescheduleOpen}
        onOpenChange={(o) =>
          !o && !rescheduleLoading && setRescheduleOpen(false)
        }
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto border-slate-100 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg text-purple-700">
              <CalendarRange className="w-5 h-5 text-purple-500 shrink-0" />{" "}
              Reschedule Callback
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Pick a new date and time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                New Time
              </Label>
              <Input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="h-12 rounded-xl w-full text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Reason
              </Label>
              <Textarea
                placeholder="Why reschedule?"
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                rows={3}
                className="resize-none rounded-xl w-full text-base"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              disabled={rescheduleLoading}
              onClick={() => setRescheduleOpen(false)}
              className="w-full sm:w-auto h-12 sm:h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRescheduleFollowUp}
              disabled={rescheduleLoading || !rescheduleDate}
              className="w-full sm:flex-1 h-12 sm:h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {rescheduleLoading ? "Rescheduling..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
