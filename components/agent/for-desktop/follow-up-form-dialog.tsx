// teleCRM/components/agent/for-desktop/follow-up-form-dialog.tsx
"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  PhoneOff,
  PhoneCall,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Connection = "CONNECTED" | "NOT_CONNECTED";
type Outcome =
  | "FOLLOW_UP_REQUIRED"
  | "SESSION_BOOKED"
  | "QUOTATION_SHARED"
  | "SALE_DONE"
  | "NOT_INTERESTED";
type NotConnReason = "SWITCHED_OFF" | "NOT_REACHABLE" | "DNP" | "OTHERS";
type MeetingPlatform = "GOOGLE_MEET" | "ZOOM" | "PERSONAL";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
  /** Optional agent personal meeting link, used when platform = Personal Link */
  personalMeetingLink?: string;
}

const MEET_LINKS: Record<MeetingPlatform, string> = {
  GOOGLE_MEET: "https://meet.google.com/new",
  ZOOM: "https://zoom.us/start/videomeeting",
  PERSONAL: "",
};

// minimum value for datetime-local (now, in local TZ)
function nowLocalIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function todayLocalIso(): string {
  return nowLocalIso().slice(0, 10);
}

export function FollowUpFormDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  onSuccess,
  personalMeetingLink = "",
}: Props) {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);

  // Wizard state
  const [connection, setConnection] = useState<Connection | "">("");
  const [outcome, setOutcome] = useState<Outcome | "">("");

  // Screen 3 — Not Connected
  const [reason, setReason] = useState<NotConnReason | "">("");
  // Screen 4 — Follow Up
  const [followUpAt, setFollowUpAt] = useState("");
  // Screen 5 — Session Booked
  const [sessionAt, setSessionAt] = useState("");
  const [platform, setPlatform] = useState<MeetingPlatform | "">("");
  // Screen 6 — Quotation
  const [quotationTitle, setQuotationTitle] = useState("");
  const [quotationValue, setQuotationValue] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  // Screen 7 — Sale Done
  const [projectName, setProjectName] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [serviceBrief, setServiceBrief] = useState("");
  // Shared
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [comments, setComments] = useState("");

  const meetingLink = useMemo(() => {
    if (!platform) return "";
    return platform === "PERSONAL" ? personalMeetingLink : MEET_LINKS[platform];
  }, [platform, personalMeetingLink]);

  // Which screen are we on?
  // 1 -> pick connection
  // 2 -> pick outcome (connection=CONNECTED)
  // 3 -> not connected form
  // 4..8 -> outcome forms
  const screen: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = useMemo(() => {
    if (!connection) return 1;
    if (connection === "NOT_CONNECTED") return 3;
    if (!outcome) return 2;
    switch (outcome) {
      case "FOLLOW_UP_REQUIRED":
        return 4;
      case "SESSION_BOOKED":
        return 5;
      case "QUOTATION_SHARED":
        return 6;
      case "SALE_DONE":
        return 7;
      case "NOT_INTERESTED":
        return 8;
    }
  }, [connection, outcome]);

  const resetAll = () => {
    setConnection("");
    setOutcome("");
    setReason("");
    setFollowUpAt("");
    setSessionAt("");
    setPlatform("");
    setQuotationTitle("");
    setQuotationValue("");
    setNextFollowUpAt("");
    setProjectName("");
    setProjectValue("");
    setSaleDate("");
    setServiceBrief("");
    setWhatsappSent(false);
    setComments("");
  };

  const close = () => {
    if (loading) return;
    onOpenChange(false);
    setTimeout(resetAll, 200);
  };

  const goBack = () => {
    if (screen === 3) return setConnection("");
    if (screen === 2) return setConnection("");
    if (screen >= 4) return setOutcome("");
  };

  const copyMeeting = async () => {
    if (!meetingLink) return;
    try {
      await navigator.clipboard.writeText(meetingLink);
      showToast("Meeting link copied", "success");
    } catch {
      showToast("Could not copy", "destructive");
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    setLoading(true);
    try {
      let payload: Record<string, any> = { leadId };

      if (screen === 3) {
        if (!reason) {
          showToast("Please select a reason", "destructive");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          type: "CALL_LOG",
          callDisposition:
            reason === "SWITCHED_OFF"
              ? "SWITCHED_OFF"
              : reason === "NOT_REACHABLE"
                ? "NOT_REACHABLE"
                : "NOT_REACHABLE",
          notConnectedReason: reason,
          whatsappSent,
          notes: comments.trim() || `Not connected — ${reason}`,
        };
      } else if (screen === 4) {
        if (!followUpAt || new Date(followUpAt) <= new Date()) {
          showToast("Pick a future date & time", "destructive");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          type: "FOLLOW_UP_NOTE",
          statusAfter: "FOLLOW_UP_SCHEDULED",
          followUpAt: new Date(followUpAt).toISOString(),
          whatsappSent,
          notes: comments.trim() || "Follow-up scheduled",
        };
      } else if (screen === 5) {
        if (!sessionAt || new Date(sessionAt) <= new Date()) {
          showToast("Pick a future session date & time", "destructive");
          setLoading(false);
          return;
        }
        if (!platform) {
          showToast("Select a meeting platform", "destructive");
          setLoading(false);
          return;
        }
        if (platform === "PERSONAL" && !meetingLink) {
          showToast(
            "Add a personal meeting link to your profile first",
            "destructive",
          );
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          type: "MEETING_SCHEDULED",
          statusAfter: "QUALIFIED",
          sessionAt: new Date(sessionAt).toISOString(),
          meetingPlatform: platform,
          meetingLink,
          whatsappSent,
          notes: comments.trim() || `Session booked on ${platform}`,
        };
      } else if (screen === 6) {
        if (!quotationTitle.trim()) {
          showToast("Quotation title required", "destructive");
          setLoading(false);
          return;
        }
        const qv = parseFloat(quotationValue);
        if (isNaN(qv) || qv <= 0) {
          showToast("Enter a valid quotation value", "destructive");
          setLoading(false);
          return;
        }
        if (!nextFollowUpAt || new Date(nextFollowUpAt) <= new Date()) {
          showToast("Pick a future follow-up date & time", "destructive");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          type: "FOLLOW_UP_NOTE",
          statusAfter: "NEGOTIATION",
          quotationTitle: quotationTitle.trim(),
          quotationValue: qv,
          followUpAt: new Date(nextFollowUpAt).toISOString(),
          notes:
            comments.trim() ||
            `Quotation "${quotationTitle.trim()}" shared — ₹${qv}`,
        };
      } else if (screen === 7) {
        if (!projectName.trim()) {
          showToast("Project name required", "destructive");
          setLoading(false);
          return;
        }
        const pv = parseFloat(projectValue);
        if (isNaN(pv) || pv <= 0) {
          showToast("Enter a valid project value", "destructive");
          setLoading(false);
          return;
        }
        if (!saleDate || new Date(saleDate) > new Date()) {
          showToast("Sale date cannot be in the future", "destructive");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          type: "STATUS_CHANGE",
          statusAfter: "CONVERTED",
          projectName: projectName.trim(),
          conversionValue: pv,
          productSelected: projectName.trim(),
          saleDate: new Date(saleDate).toISOString(),
          serviceBrief: serviceBrief.trim() || undefined,
          notes: `Sale Done — ${projectName.trim()} (₹${pv})`,
        };
      } else if (screen === 8) {
        payload = {
          ...payload,
          type: "STATUS_CHANGE",
          statusAfter: "NOT_INTERESTED",
          notes: comments.trim() || "Marked as Not Interested",
        };
      } else {
        setLoading(false);
        return;
      }

      await api.post("/agent/conversation", payload);
      showToast("Follow-up saved", "success");
      setTimeout(() => {
        onSuccess();
        close();
      }, 500);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to save follow-up",
        "destructive",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const stepLabel =
    screen === 1
      ? "Step 1 of 2 · Connection"
      : screen === 2
        ? "Step 2 of 2 · Outcome"
        : "Final details";

  const showBack = screen !== 1;
  const isSubmitScreen = screen >= 3;

  return (
    <>
      {ToastComponent}
      <Dialog open={open} onOpenChange={(o) => !loading && (o ? onOpenChange(o) : close())}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b">
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={goBack}
                  disabled={loading}
                  className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-600"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  Log Follow-Up
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {leadName} · {stepLabel}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-5">
            {/* Screen 1 — Connection */}
            {screen === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConnection("CONNECTED")}
                  className="p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition group"
                >
                  <PhoneCall className="text-emerald-600 mb-2" size={22} />
                  <div className="font-bold text-slate-900">Connected</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Spoke to the lead
                  </div>
                </button>
                <button
                  onClick={() => setConnection("NOT_CONNECTED")}
                  className="p-5 rounded-xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-left transition group"
                >
                  <PhoneOff className="text-amber-600 mb-2" size={22} />
                  <div className="font-bold text-slate-900">Not Connected</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Couldn't reach them
                  </div>
                </button>
              </div>
            )}

            {/* Screen 2 — Outcome */}
            {screen === 2 && (
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "FOLLOW_UP_REQUIRED", label: "Follow Up Required", icon: CalendarClock, color: "indigo" },
                  { id: "SESSION_BOOKED", label: "Session Booked", icon: Video, color: "violet" },
                  { id: "QUOTATION_SHARED", label: "Quotation Finalized & Shared", icon: ClipboardList, color: "blue" },
                  { id: "SALE_DONE", label: "Sale Done", icon: CheckCircle2, color: "emerald" },
                  { id: "NOT_INTERESTED", label: "Not Interested", icon: XCircle, color: "rose" },
                ].map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOutcome(o.id as Outcome)}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 flex items-center gap-3 text-left transition"
                    >
                      <Icon size={18} className={`text-${o.color}-600`} />
                      <span className="font-semibold text-slate-800 flex-1">
                        {o.label}
                      </span>
                      <ArrowRight size={16} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Screen 3 — Not Connected */}
            {screen === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={(v) => setReason(v as NotConnReason)}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SWITCHED_OFF">Switched Off</SelectItem>
                      <SelectItem value="NOT_REACHABLE">Not Reachable</SelectItem>
                      <SelectItem value="DNP">Did Not Pick (DNP)</SelectItem>
                      <SelectItem value="OTHERS">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <WhatsAppRow value={whatsappSent} onChange={setWhatsappSent} />
                <CommentsRow value={comments} onChange={setComments} />
              </>
            )}

            {/* Screen 4 — Follow Up Required */}
            {screen === 4 && (
              <>
                <div className="space-y-2">
                  <Label>Follow-Up Date & Time</Label>
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                </div>
                <WhatsAppRow value={whatsappSent} onChange={setWhatsappSent} />
                <CommentsRow value={comments} onChange={setComments} />
              </>
            )}

            {/* Screen 5 — Session Booked */}
            {screen === 5 && (
              <>
                <div className="space-y-2">
                  <Label>Session Date & Time</Label>
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    value={sessionAt}
                    onChange={(e) => setSessionAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Platform</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as MeetingPlatform)}>
                    <SelectTrigger><SelectValue placeholder="Choose platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                      <SelectItem value="ZOOM">Zoom</SelectItem>
                      <SelectItem value="PERSONAL">Personal Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {platform && (
                  <div className="space-y-2">
                    <Label>Meeting Link</Label>
                    <div className="flex gap-2">
                      <Input value={meetingLink} readOnly className="bg-slate-50" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyMeeting}
                        disabled={!meetingLink}
                      >
                        <Copy size={14} className="mr-1" /> Copy
                      </Button>
                    </div>
                    {platform === "PERSONAL" && !meetingLink && (
                      <p className="text-xs text-amber-600">
                        No personal link set on your profile.
                      </p>
                    )}
                  </div>
                )}
                <WhatsAppRow value={whatsappSent} onChange={setWhatsappSent} />
                <CommentsRow value={comments} onChange={setComments} />
              </>
            )}

            {/* Screen 6 — Quotation */}
            {screen === 6 && (
              <>
                <div className="space-y-2">
                  <Label>Quotation Title</Label>
                  <Input
                    value={quotationTitle}
                    onChange={(e) => setQuotationTitle(e.target.value)}
                    placeholder="e.g. Pro Plan – 12 months"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quotation Value (₹)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={quotationValue}
                    onChange={(e) => setQuotationValue(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Follow-Up Date & Time</Label>
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                </div>
                <CommentsRow value={comments} onChange={setComments} />
              </>
            )}

            {/* Screen 7 — Sale Done */}
            {screen === 7 && (
              <>
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Website Revamp"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Value (₹)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={projectValue}
                    onChange={(e) => setProjectValue(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sale Date</Label>
                  <Input
                    type="date"
                    max={todayLocalIso()}
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Brief</Label>
                  <Textarea
                    rows={3}
                    value={serviceBrief}
                    onChange={(e) => setServiceBrief(e.target.value)}
                    placeholder="What was sold and any key terms"
                  />
                </div>
              </>
            )}

            {/* Screen 8 — Not Interested */}
            {screen === 8 && (
              <CommentsRow value={comments} onChange={setComments} required />
            )}
          </div>

          {isSubmitScreen && (
            <DialogFooter className="px-6 py-4 border-t bg-slate-50">
              <Button variant="outline" disabled={loading} onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? "Saving..." : "Submit"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── tiny shared field rows ───────────────────────────────────────────────────
function WhatsAppRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-sm font-medium text-slate-700">
        Communication sent on WhatsApp
      </span>
    </label>
  );
}
function CommentsRow({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Comments {required ? "" : <span className="text-xs text-slate-400">(optional)</span>}</Label>
      <Textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add any notes about this interaction…"
      />
    </div>
  );
}
