// teleCRM/components/agent/for-desktop/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageCircle,
  Phone,
  User,
  XCircle,
  FileText,
  Briefcase,
  TrendingUp,
  FileCheck2,
  CalendarRange,
  Volume2,
  PhoneOff,
  PhoneMissed,
  PhoneCall,
  AlertTriangle,
  Paperclip,
} from "lucide-react";
import { ConversionDialog } from "./conversion-dialog";
import { FollowUpFormDialog } from "./follow-up-form-dialog";

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

// ─── Pipeline Constants ───────────────────────────────────────────────────────

const pipelineStages: { status: LeadJourneyStatus; label: string }[] = [
  { status: "FRESH_LEAD", label: "Fresh Lead" },
  { status: "ATTEMPTED_CONTACT", label: "Attempted" },
  { status: "CONNECTED", label: "Connected" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "INTERESTED", label: "Interested" },
  { status: "FOLLOW_UP_SCHEDULED", label: "Follow-Up" },
  { status: "NEGOTIATION", label: "Negotiation" },
  { status: "DOCUMENTATION_PENDING", label: "Docs Pending" },
  { status: "CONVERTED", label: "Converted" },
  { status: "LOST", label: "Lost" },
];

const priorityConfig: Record<Lead["priority"], { cls: string }> = {
  HIGH: { cls: "bg-rose-50 text-rose-700 border-rose-100" },
  MEDIUM: { cls: "bg-amber-50 text-amber-700 border-amber-100" },
  LOW: { cls: "bg-slate-50 text-slate-650 border-slate-200" },
};

const conversationTypeLabel: Record<ConversationType, string> = {
  CALL_LOG: "Call Logged",
  FOLLOW_UP_NOTE: "Follow-Up Note",
  WHATSAPP_INTERACTION: "WhatsApp Chat",
  SMS_LOG: "SMS Logged",
  EMAIL_ACTIVITY: "Email Interaction",
  INTERNAL_NOTE: "Internal Team Note",
  MEETING_SCHEDULED: "Meeting Set",
  SITE_VISIT: "Site Visit Logged",
  STATUS_CHANGE: "Status Changed",
  REASSIGNMENT_ACTIVITY: "Lead Reassigned",
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
    cls: "bg-slate-50 text-slate-700",
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
    label: "Callback Requested",
    cls: "bg-purple-50 text-purple-700",
    icon: <PhoneCall size={11} />,
  },
  FOLLOW_UP_REQUIRED: {
    label: "Follow-Up Required",
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

function formatJourneyStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().+]/g, "");
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `+91${digits}`;
  }
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

// ─── Activity Timeline Entry ──────────────────────────────────────────────────

function ActivityEntry({ conversation }: { conversation: LeadConversation }) {
  const disp = conversation.callDisposition;
  const dispCfg = disp ? dispositionConfig[disp] : null;

  const iconBg =
    disp === "CONNECTED" || disp === "INTERESTED"
      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
      : disp && !isConnectedDisposition(disp)
        ? "bg-rose-50 border-rose-200 text-rose-500"
        : conversation.type === "WHATSAPP_INTERACTION"
          ? "bg-teal-50 border-teal-200 text-teal-600"
          : conversation.type === "STATUS_CHANGE"
            ? "bg-amber-50 border-amber-200 text-amber-600"
            : conversation.type === "FOLLOW_UP_NOTE"
              ? "bg-purple-50 border-purple-200 text-purple-600"
              : "bg-blue-50 border-blue-200 text-blue-500";

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
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${iconBg} shadow-sm group-hover:scale-105 transition-transform`}
        >
          {getIcon()}
        </div>
        <div className="w-px flex-1 bg-slate-100 group-last:hidden mt-1.5" />
      </div>

      {/* min-w-0 prevents flex child from overflowing */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-100/90 p-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate">
                {conversationTypeLabel[conversation.type] ?? conversation.type}
              </span>
              {dispCfg && (
                <Badge
                  variant="outline"
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border-0 shrink-0 ${dispCfg.cls}`}
                >
                  <span className="flex items-center gap-1">
                    {dispCfg.icon} {dispCfg.label}
                  </span>
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0 ml-1">
              {formatDateTime(conversation.createdAt)}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-semibold mt-1 truncate">
            Logged by {conversation.agent.email.split("@")[0]} (
            {conversation.agent.designation})
          </p>

          {conversation.notes && (
            <p className="mt-2 text-sm text-slate-650 leading-relaxed font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 break-words">
              {conversation.notes}
            </p>
          )}

          {conversation.callDuration != null && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                <Clock size={11} /> Duration: {conversation.callDuration}s
              </span>
              {conversation.recordingUrl && (
                <a
                  href={conversation.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full border transition-colors"
                >
                  <Volume2 size={11} /> Listen Recording
                </a>
              )}
            </div>
          )}

          {conversation.nextAction && (
            <div className="mt-2 text-xs text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5 font-medium break-words">
              <span className="font-bold text-blue-700">Next Action: </span>
              {conversation.nextAction}
            </div>
          )}

          {conversation.followUpDate && (
            <div className="mt-2.5 text-xs text-purple-700 bg-purple-50 border border-purple-100 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold flex-wrap">
              <CalendarClock size={11} className="shrink-0" /> Callback
              Scheduled: {formatDateTime(conversation.followUpDate)}
            </div>
          )}

          {conversation.statusAfter && (
            <div className="mt-2.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 inline-flex rounded-full px-2.5 py-0.5 flex-wrap gap-0.5 max-w-full">
              <span>Pipeline:</span>
              <span>
                {conversation.statusBefore
                  ? formatJourneyStatus(conversation.statusBefore)
                  : "Fresh"}{" "}
                →{" "}
              </span>
              <span className="underline">
                {formatJourneyStatus(conversation.statusAfter)}
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
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full border transition-colors max-w-full overflow-hidden"
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

  const [transitionStatus, setTransitionStatus] =
    useState<LeadJourneyStatus | null>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleFollowUpId, setRescheduleFollowUpId] = useState<
    string | null
  >(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

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

  // ── Form Submit Handlers ──────────────────────────────────────────────────

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

  // ── Follow-up Actions ─────────────────────────────────────────────────────

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

  // ── Pipeline Transition Handlers ──────────────────────────────────────────

  const handlePipelineStepClick = (status: LeadJourneyStatus) => {
    if (!lead || lead.currentJourneyStatus === status) return;
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
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

  return (
    // KEY FIX: w-full + overflow-x-hidden on the root container
    <div className="w-full overflow-x-hidden">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
        {ToastComponent}

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/agent/leads")}
          className="gap-2 -ml-2 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Leads Directory
        </Button>

        {/* ── Header Card ────────────────────────────────────────────────────── */}
        <Card className=" gap-0 border border-slate-100 bg-white shadow-sm overflow-hidden">
          <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:px-6">
            <div className="flex flex-col gap-4">
              {/* Name + badges row */}
              <div className="flex flex-col gap-3">
                <div className="space-y-1 min-w-0 w-full">
                  {/* Badges wrap on small screens */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight break-words min-w-0">
                      {lead.name}
                    </h1>
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2.5 py-0.5 text-[10px] border shrink-0 ${leadPriorityObj.cls}`}
                    >
                      {lead.priority} Priority
                    </Badge>
                    {lead.approvalStatus === "PENDING" && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-50 text-amber-800 border-amber-200 shrink-0"
                      >
                        Pending Approval
                      </Badge>
                    )}
                  </div>
                  {/* Phone + email — stack on very small screens */}
                  <div className="text-sm text-slate-500 tracking-wide font-medium break-all flex flex-wrap items-center gap-3">
                    {/* <span className="font-mono">{lead.phone}</span> */}
                    <span className="text-slate-300 mx-1.5">·</span>
                    <span className="text-slate-400 font-sans">
                      {lead.data?.email || lead.data?.["Contact Email"] }
                    </span>
                    <span className="text-slate-400 font-sans">
                      {lead.data?.["Industry / Sector"]}
                    </span>
                  </div>
                </div>

                {/* Status pill — full width on mobile */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border self-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="text-xs min-w-0">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] leading-none">
                      Current Status
                    </p>
                    <p className="text-slate-700 font-bold mt-1 text-[13px] truncate">
                      {formatJourneyStatus(lead.currentJourneyStatus)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Quick Action Buttons ─────────────────────────────────── */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={telHref}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm transition-colors select-none"
                  aria-label={`Call ${lead.name}`}
                >
                  <Phone size={15} />
                  <span>Call</span>
                  <span className="hidden sm:inline text-blue-200 font-mono text-xs truncate max-w-[120px]">
                    {/* {lead.phone} */}
                  </span>
                </a>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20b858] active:bg-[#1da34f] text-white text-sm font-bold shadow-sm transition-colors select-none"
                  aria-label={`WhatsApp ${lead.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 shrink-0"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <Button
                  onClick={() => setFollowUpOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
                >
                  <CalendarClock size={16} />
                  Log Follow-Up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Pipeline Stepper ───────────────────────────────────────────────── */}
        <div className="bg-white border rounded-2xl p-3 sm:p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-0.5 flex-wrap gap-1">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Lead Sales Progression
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 hidden sm:block">
              Click target stage to transition
            </span>
          </div>
          {/* Horizontal scroll container — constrained within card */}
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex items-center gap-1 w-max">
              {pipelineStages.map((stage, idx) => {
                const currentIdx = pipelineStages.findIndex(
                  (s) => s.status === lead.currentJourneyStatus,
                );
                const isCompleted = idx < currentIdx;
                const isActive = stage.status === lead.currentJourneyStatus;
                let stepColor =
                  "bg-slate-50 border-slate-100 hover:bg-slate-100/80 text-slate-500";
                if (isActive)
                  stepColor =
                    "bg-blue-600 border-blue-600 text-white shadow-md font-bold ring-4 ring-blue-100 scale-105";
                else if (isCompleted)
                  stepColor =
                    "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/50";
                return (
                  <button
                    key={stage.status}
                    disabled={!canCall}
                    onClick={() => handlePipelineStepClick(stage.status)}
                    className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${stepColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="flex items-center gap-1">
                      {isCompleted && <FileCheck2 size={11} />}
                      {stage.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Two-Column Layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT: Lead Details */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6 min-w-0">
            <Card className="gap-0 border border-slate-100 shadow-sm bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100/80 py-3 px-4 sm:py-3.5 sm:px-5">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase size={15} className="text-slate-500 shrink-0" />{" "}
                  Lead Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <Tabs defaultValue="basic" className="w-full">
                  {/* Split into two rows of 3 tabs each for narrow screens */}
                  <TabsList className="grid grid-cols-3 bg-slate-100 rounded-xl p-1 h-auto mb-2">
                    <TabsTrigger
                      value="basic"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Basic
                    </TabsTrigger>
                    <TabsTrigger
                      value="source"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Source
                    </TabsTrigger>
                    <TabsTrigger
                      value="campaign"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Campaign
                    </TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-3 bg-slate-100 rounded-xl p-1 h-auto mb-3">
                    <TabsTrigger
                      value="documents"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Docs
                    </TabsTrigger>
                    <TabsTrigger
                      value="assignment"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Assigns
                    </TabsTrigger>
                    <TabsTrigger
                      value="summary"
                      className="text-[11px] py-1.5 font-bold rounded-lg cursor-pointer"
                    >
                      Timeline
                    </TabsTrigger>
                  </TabsList>

                  {/* BASIC INFO */}
                  <TabsContent
                    value="basic"
                    className="pt-1 max-h-[500px] overflow-y-auto pr-2 space-y-3 scrollbar-thin"
                  >
                    {
                      // [
                      //   { label: "Name", value: lead.name },
                      //   // { label: "Mobile Number", value: lead.phone },
                      //   { label: "Email", value: lead.data?.email },
                      //   { label: "City / State", value: lead.data?.["City / Location"] },
                      //   {
                      //     label: "Created Time",
                      //     value: formatDateTime(lead.createdAt),
                      //   },
                      // ]

                      [
                        { label: "Name", value: lead?.name },

                        // { label: "Mobile", value: lead.phone },

                        {
                          label: "Email",
                          value:
                            lead?.data?.email || lead?.data?.["Contact Email"],
                        },

                        {
                          label: "City / State",
                          value:
                            lead?.data?.city || lead?.data?.["City / Location"],
                        },

                        // {
                        //   label: "Business Name",
                        //   value:
                        //     lead?.data?.businessName || lead?.data?.["Business Name"],
                        // },

                        {
                          label: "Industry / Sector",
                          value:
                            lead?.data?.industry ||
                            lead?.data?.["Industry / Sector"],
                        },

                        {
                          label: "Website (Y/N)",
                          value:
                            lead?.data?.websiteAvailable ||
                            lead?.data?.["Website (Y/N)"],
                        },

                        {
                          label: "Website Link",
                          value:
                            lead?.data?.websiteLink ||
                            lead?.data?.["Website Link"],
                        },

                        {
                          label: "Social Media",
                          value:
                            lead?.data?.socialMedia ||
                            lead?.data?.["Social Media"],
                        },

                        {
                          label: "Quality of Online Presence",
                          value:
                            lead?.data?.qualityOfOnlinePresence ||
                            lead?.data?.["Quality of Online Presence"],
                        },

                        {
                          label: "Contact Number",
                          value:
                            lead?.data?.contactNumber ||
                            lead?.data?.["Contact Number"],
                        },

                        {
                          label: "Profile Link",
                          value:
                            lead?.data?.profileLink ||
                            lead?.data?.[
                              "Profile Link (Link of Social Media Page)"
                            ],
                        },

                        {
                          label: "Contact Email",
                          value:
                            lead?.data?.contactEmail ||
                            lead?.data?.["Contact Email"],
                        },

                        {
                          label: "Need Identified",
                          value:
                            lead?.data?.needIdentified ||
                            lead?.data?.["Need Identified"],
                        },

                        {
                          label: "Source of Lead",
                          value:
                            lead?.data?.sourceOfLead ||
                            lead?.data?.["Source of Lead"],
                        },

                        {
                          label: "Priority Level",
                          value:
                            lead?.data?.priorityLevel ||
                            lead?.data?.["Priority Level"],
                        },

                        {
                          label: "Outreach Status",
                          value:
                            lead?.data?.outreachStatus ||
                            lead?.data?.["Outreach Status"],
                        },

                        {
                          label: "Next Follow-Up Date",
                          value:
                            lead?.data?.nextFollowUpDate ||
                            lead?.data?.["Next Follow-Up Date"],
                        },

                        {
                          label: "Notes",
                          value: lead?.data?.notes || lead?.data?.["Notes"],
                        },

                        {
                          label: "Additional Comments",
                          value:
                            lead?.data?.additionalComments ||
                            lead?.data?.["Additional Comments"],
                        },

                        {
                          label: "Source Link",
                          value:
                            lead?.data?.sourceLink ||
                            lead?.data?.["Source Link"],
                        },

                        {
                          label: "Created",
                          value: formatDateTime(lead?.createdAt),
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="border-b border-slate-50 pb-2 space-y-0.5 last:border-0 last:pb-0"
                        >
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {item.label}
                          </span>
                          <p className="text-sm font-semibold text-slate-800 break-words">
                            {item.value}
                          </p>
                        </div>
                      ))
                    }
                  </TabsContent>

                  {/* SOURCE INFO */}
                  <TabsContent value="source" className="space-y-3 pt-1">
                    {[
                      { label: "Campaign Source", value: campaignSource },
                      { label: "Campaign Medium", value: campaignMedium },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="border-b border-slate-50 pb-2 space-y-0.5 last:border-0 last:pb-0"
                      >
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 break-words">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </TabsContent>

                  {/* CAMPAIGN */}
                  <TabsContent value="campaign" className="space-y-3 pt-1">
                    {[
                      {
                        label: "Product Interested In",
                        value: productInterested,
                      },
                      {
                        label: "Meta Campaign Name",
                        value: lData.campaignName ?? "Direct Inquiry",
                      },
                      {
                        label: "Meta Ad Name",
                        value: lData.adName ?? "Main Headline",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="border-b border-slate-50 pb-2 space-y-0.5 last:border-0 last:pb-0"
                      >
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 break-words">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </TabsContent>

                  {/* DOCUMENTS */}
                  <TabsContent value="documents" className="pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3">
                      Uploaded Lead Files
                    </span>
                    {(lead.attachments ?? []).length > 0 ? (
                      <div className="space-y-2">
                        {(lead.attachments ?? []).map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg hover:bg-slate-100/80 transition-colors overflow-hidden"
                          >
                            <FileText
                              size={16}
                              className="text-blue-500 shrink-0"
                            />
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-slate-700 hover:text-blue-600 truncate flex-1 min-w-0"
                            >
                              {att.fileName}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : Array.isArray(uploadedDocs) &&
                      uploadedDocs.length > 0 ? (
                      <div className="space-y-2">
                        {uploadedDocs.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg hover:bg-slate-100/80 overflow-hidden"
                          >
                            <FileText
                              size={16}
                              className="text-blue-500 shrink-0"
                            />
                            <a
                              href={doc.url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-slate-700 hover:text-blue-600 truncate flex-1 min-w-0"
                            >
                              {doc.name ?? `Document_${i + 1}`}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 border border-dashed rounded-xl">
                        <FileText
                          size={24}
                          className="mx-auto text-slate-300 mb-1"
                        />
                        <p className="text-slate-400 text-xs font-medium">
                          No documents attached.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ASSIGNMENT */}
                  <TabsContent value="assignment" className="space-y-3 pt-1">
                    {[
                      { label: "Department Owner", value: "Sales Operations" },
                      {
                        label: "Assigned Team",
                        value: lead.team?.name ?? "General CRM Team",
                      },
                      {
                        label: "Assigned Agent L3",
                        value:
                          lead.assignedToUser?.email.split("@")[0] ??
                          "Unassigned",
                      },
                      {
                        label: "Agent Designation",
                        value: lead.assignedToUser?.designation ?? "—",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="border-b border-slate-50 pb-2 space-y-0.5 last:border-0 last:pb-0"
                      >
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 break-words">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </TabsContent>

                  {/* TIMELINE SUMMARY */}
                  <TabsContent value="summary" className="space-y-3 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Lead Milestone Summary
                    </span>
                    <div className="relative pl-4 space-y-3 border-l border-slate-150">
                      <div className="space-y-0.5 relative">
                        <span className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Created
                        </p>
                        <p className="text-[11px] font-semibold text-slate-650">
                          {formatDateTime(lead.createdAt)}
                        </p>
                      </div>
                      {lead.approvalStatus === "APPROVED" && (
                        <div className="space-y-0.5 relative">
                          <span className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Approved
                          </p>
                          <p className="text-[11px] font-semibold text-slate-650">
                            Ready in workspace
                          </p>
                        </div>
                      )}
                      {lData.conversionData && (
                        <div className="space-y-0.5 relative">
                          <span className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
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
                        <div className="space-y-0.5 relative">
                          <span className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-rose-500" />
                          <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                            Closed
                          </p>
                          <p className="text-xs font-bold text-slate-800 break-words">
                            Reason: {lData.closureData.lossReason}
                          </p>
                        </div>
                      )}
                      {(lead.statusHistory ?? []).slice(0, 5).map((h) => (
                        <div key={h.id} className="space-y-0.5 relative">
                          <span className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-indigo-400" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider break-words">
                            {formatJourneyStatus(h.fromStatus)} →{" "}
                            {formatJourneyStatus(h.toStatus)}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-650">
                            {formatDateTime(h.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Activity Creator + Timeline */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
            {/* Pending Follow-ups */}
            {pendingFollowUps.length > 0 && (
              <Card className="gap-0 border-purple-100 bg-gradient-to-r from-purple-500/[0.03] to-purple-500/[0.08] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="py-3 px-4 sm:px-5 border-b border-purple-100/50 flex flex-row items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold text-purple-800 flex items-center gap-1.5">
                    <CalendarRange size={15} className="shrink-0" /> Pending
                    Callback Schedules ({pendingFollowUps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  {pendingFollowUps.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-purple-100 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1 flex-wrap">
                          <Clock
                            size={12}
                            className="text-purple-500 shrink-0"
                          />{" "}
                          {formatDateTime(f.followUpAt)}
                        </p>
                        {f.notes && (
                          <p className="text-xs text-slate-500 mt-1 font-medium break-words">
                            {f.notes}
                          </p>
                        )}
                      </div>
                      {canCall && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => completeFollowUp(f.id)}
                            className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3"
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRescheduleModal(f)}
                            className="h-8 text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg px-3"
                          >
                            Reschedule
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Activity Creator */}
            {canCall && (
              <Card className="gap-0 border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                {/* Tab bar — horizontal scroll on mobile */}
                <div className="bg-slate-50/50 border-b flex gap-0.5 px-2 sm:px-4 py-2 overflow-x-auto scrollbar-none">
                  {[
                    {
                      id: "call" as const,
                      label: "Log Call",
                      icon: <Phone size={13} />,
                    },
                    {
                      id: "whatsapp" as const,
                      label: "WhatsApp",
                      icon: <MessageCircle size={13} />,
                    },
                    {
                      id: "followup" as const,
                      label: "Callback",
                      icon: <CalendarClock size={13} />,
                    },
                    {
                      id: "note" as const,
                      label: "Note",
                      icon: <ClipboardList size={13} />,
                    },
                  ].map((ft) => (
                    <button
                      key={ft.id}
                      onClick={() => setActiveForm(ft.id)}
                      className={`px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeForm === ft.id
                          ? "bg-white border text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                      }`}
                    >
                      {ft.icon}
                      <span>{ft.label}</span>
                    </button>
                  ))}
                </div>

                <CardContent className="p-4 sm:p-5">
                  {/* CALL LOG */}
                  {activeForm === "call" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-slate-700 text-xs">
                            Call Disposition
                          </Label>
                          <Select
                            value={callDisposition}
                            onValueChange={(v) =>
                              setCallDisposition(v as CallDisposition)
                            }
                          >
                            <SelectTrigger className="h-10 focus:ring-blue-500 rounded-xl w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {callDispositionFormOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className="font-semibold text-slate-700">
                                    {opt.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {isConnectedDisposition(callDisposition) && (
                          <div className="space-y-1.5">
                            <Label className="font-semibold text-slate-700 text-xs">
                              Call Duration (seconds)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="seconds"
                              value={callDuration}
                              onChange={(e) => setCallDuration(e.target.value)}
                              className="h-10 rounded-xl w-full"
                            />
                          </div>
                        )}
                      </div>

                      {isConnectedDisposition(callDisposition) && (
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-slate-700 text-xs">
                            Recording URL{" "}
                            <span className="text-muted-foreground font-normal text-[10px]">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            type="text"
                            placeholder="https://storage.example.com/recording.mp3"
                            value={recordingUrl}
                            onChange={(e) => setRecordingUrl(e.target.value)}
                            className="h-10 rounded-xl w-full"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          Conversation Notes
                        </Label>
                        <Textarea
                          placeholder="Log detailed remarks from this call..."
                          value={callNotes}
                          onChange={(e) => setCallNotes(e.target.value)}
                          rows={3}
                          className="resize-none rounded-xl w-full"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          Next Action{" "}
                          <span className="text-muted-foreground font-normal text-[10px]">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="e.g. Send proposal, Schedule demo..."
                          value={nextAction}
                          onChange={(e) => setNextAction(e.target.value)}
                          className="h-10 rounded-xl w-full"
                        />
                      </div>

                      <Button
                        onClick={submitCallLog}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm w-full"
                      >
                        {actionLoading ? "Logging..." : "Save Call Activity"}
                      </Button>
                    </div>
                  )}

                  {/* WHATSAPP */}
                  {activeForm === "whatsapp" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          WhatsApp Conversation Details
                        </Label>
                        <Textarea
                          placeholder="Paste details or log concerns from the WhatsApp discussion..."
                          value={waNotes}
                          onChange={(e) => setWaNotes(e.target.value)}
                          rows={3}
                          className="resize-none rounded-xl w-full"
                        />
                      </div>
                      <Button
                        onClick={submitWhatsAppLog}
                        disabled={actionLoading}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm w-full"
                      >
                        {actionLoading ? "Logging..." : "Save WhatsApp Details"}
                      </Button>
                    </div>
                  )}

                  {/* FOLLOW-UP */}
                  {activeForm === "followup" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          Follow-Up Date & Time
                        </Label>
                        <Input
                          type="datetime-local"
                          value={fDate}
                          onChange={(e) => setFDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="h-10 rounded-xl w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          Callback Purpose / Notes
                        </Label>
                        <Textarea
                          placeholder="Log what to discuss or follow-up on during the next contact..."
                          value={fNotes}
                          onChange={(e) => setFNotes(e.target.value)}
                          rows={2}
                          className="resize-none rounded-xl w-full"
                        />
                      </div>
                      <Button
                        onClick={submitScheduleFollowUp}
                        disabled={actionLoading || !fDate}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm w-full"
                      >
                        {actionLoading
                          ? "Scheduling..."
                          : "Set Callback Reminder"}
                      </Button>
                    </div>
                  )}

                  {/* INTERNAL NOTE */}
                  {activeForm === "note" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-slate-700 text-xs">
                          Internal Team Memo
                        </Label>
                        <Textarea
                          placeholder="Notes visible strictly to team managers (L2) and fellow admins..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          rows={3}
                          className="resize-none rounded-xl w-full"
                        />
                      </div>
                      <Button
                        onClick={submitInternalNote}
                        disabled={actionLoading}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow-sm w-full"
                      >
                        {actionLoading ? "Saving..." : "Add Internal Note"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card className="gap-0 border border-slate-100 shadow-sm bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100/80 py-3 px-4 sm:py-3.5 sm:px-5">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <span>Customer Journey Timeline</span>
                  <span className="text-[11px] bg-slate-200 text-slate-700 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider shrink-0">
                    {lead.conversations.length} Events
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {lead.conversations.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 text-slate-400">
                    <Clock
                      size={36}
                      className="mx-auto text-slate-200 mb-2 stroke-[1.5]"
                    />
                    <p className="text-sm font-bold text-slate-800">
                      No Activity Logged Yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Log call activity, WhatsApp notes, or schedule callbacks
                      above to start recording the lifecycle journey.
                    </p>
                  </div>
                ) : (
                  <div className="pt-2">
                    {lead.conversations.map((c) => (
                      <ActivityEntry key={c.id} conversation={c} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MODAL 1: Standard Status Change */}
        <Dialog
          open={statusConfirmOpen}
          onOpenChange={(o) => !o && setStatusConfirmOpen(false)}
        >
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto border-slate-100 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-lg text-slate-800">
                <TrendingUp className="text-blue-500 w-5 h-5 shrink-0" />{" "}
                Confirm Pipeline Transition
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium break-words">
                Transitioning lead to{" "}
                <strong className="text-blue-600 font-bold">
                  {transitionStatus
                    ? formatJourneyStatus(transitionStatus)
                    : ""}
                </strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label className="font-semibold text-slate-700 text-xs">
                Transition Comments / Remarks
              </Label>
              <Textarea
                placeholder="Why are you moving the lead? Add transition context..."
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                rows={3}
                className="resize-none rounded-xl w-full"
              />
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                disabled={statusChangeLoading}
                onClick={() => setStatusConfirmOpen(false)}
                className="border-slate-200 font-medium text-slate-650 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={submitStandardStatusChange}
                disabled={statusChangeLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full sm:w-auto"
              >
                {statusChangeLoading ? "Transitioning..." : "Confirm Step"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: Conversion / Closure */}
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

        <FollowUpFormDialog
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          leadId={lead?.id ?? ""}
          leadName={lead?.name ?? "this lead"}
          onSuccess={fetchLead}
        />

        {/* MODAL 3: Reschedule Follow-up */}
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
                Pick a new date and time for this follow-up reminder.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-xs">
                  New Callback Time
                </Label>
                <Input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="h-10 rounded-xl w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-xs">
                  Reschedule Reason / Purpose
                </Label>
                <Textarea
                  placeholder="Log context for this reschedule..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  rows={2}
                  className="resize-none rounded-xl w-full"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                disabled={rescheduleLoading}
                onClick={() => setRescheduleOpen(false)}
                className="border-slate-200 font-medium text-slate-650 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={submitRescheduleFollowUp}
                disabled={rescheduleLoading || !rescheduleDate}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold w-full sm:w-auto"
              >
                {rescheduleLoading ? "Rescheduling..." : "Reschedule Callback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
