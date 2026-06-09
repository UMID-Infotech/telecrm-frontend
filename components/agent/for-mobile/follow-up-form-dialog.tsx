// teleCRM/components/agent/for-mobile/follow-up-form-dialog.tsx
"use client";

// NOTE: Logic is identical to ../for-desktop/follow-up-form-dialog.tsx.
// Re-export and override layout for mobile bottom-sheet ergonomics.

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  X,
  XCircle,
} from "lucide-react";

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
  personalMeetingLink?: string;
}

const MEET_LINKS: Record<MeetingPlatform, string> = {
  GOOGLE_MEET: "https://meet.google.com/new",
  ZOOM: "https://zoom.us/start/videomeeting",
  PERSONAL: "",
};

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

  const [connection, setConnection] = useState<Connection | "">("");
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [reason, setReason] = useState<NotConnReason | "">("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [sessionAt, setSessionAt] = useState("");
  const [platform, setPlatform] = useState<MeetingPlatform | "">("");
  const [quotationTitle, setQuotationTitle] = useState("");
  const [quotationValue, setQuotationValue] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [serviceBrief, setServiceBrief] = useState("");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [comments, setComments] = useState("");
  const [callDuration, setCallDuration] = useState<string>("45");

  const meetingLink = useMemo(() => {
    if (!platform) return "";
    return platform === "PERSONAL" ? personalMeetingLink : MEET_LINKS[platform];
  }, [platform, personalMeetingLink]);

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
    setCallDuration("45");
  };

  const close = () => {
    if (loading) return;
    onOpenChange(false);
    setTimeout(resetAll, 200);
  };

  const goBack = () => {
    if (screen === 3 || screen === 2) return setConnection("");
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
            reason === "SWITCHED_OFF" ? "SWITCHED_OFF" : "NOT_REACHABLE",
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
          callDuration: callDuration ? parseInt(callDuration, 10) : undefined,
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

  const isSubmitScreen = screen >= 3;
  const stepLabel =
    screen === 1 ? "Connection" : screen === 2 ? "Outcome" : "Details";

  return (
    <>
      {ToastComponent}
      <Dialog
        open={open}
        onOpenChange={(o) => !loading && (o ? onOpenChange(o) : close())}
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
          {/* grab handle */}
          <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-200" />
          </div>

          <DialogHeader className="px-5 pt-2 pb-3 border-b text-left shrink-0">
            <div className="flex items-center gap-2">
              {screen !== 1 ? (
                <button
                  onClick={goBack}
                  disabled={loading}
                  className="w-9 h-9 grid place-items-center rounded-full active:bg-slate-100 text-slate-600 shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <div className="w-9 h-9 grid place-items-center rounded-full bg-indigo-50 text-indigo-600 shrink-0">
                  <Sparkles size={16} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-extrabold text-slate-900 truncate">
                  Log Follow-Up
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 truncate">
                  {leadName} · {stepLabel}
                </DialogDescription>
              </div>
              <button
                onClick={close}
                className="w-9 h-9 grid place-items-center rounded-full active:bg-slate-100 text-slate-500 shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </DialogHeader>

          {/* body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {screen === 1 && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setConnection("CONNECTED")}
                  className="p-5 rounded-2xl border-2 border-slate-200 active:border-emerald-500 active:bg-emerald-50 flex items-center gap-4 text-left transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                    <PhoneCall size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Connected</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Spoke to the lead
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-400" />
                </button>
                <button
                  onClick={() => setConnection("NOT_CONNECTED")}
                  className="p-5 rounded-2xl border-2 border-slate-200 active:border-amber-500 active:bg-amber-50 flex items-center gap-4 text-left transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center shrink-0">
                    <PhoneOff size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">
                      Not Connected
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Couldn't reach them
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-400" />
                </button>
              </div>
            )}

            {screen === 2 && (
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: "FOLLOW_UP_REQUIRED",
                    label: "Follow Up Required",
                    icon: CalendarClock,
                    color: "indigo",
                  },
                  {
                    id: "SESSION_BOOKED",
                    label: "Session Booked",
                    icon: Video,
                    color: "violet",
                  },
                  {
                    id: "QUOTATION_SHARED",
                    label: "Quotation Finalized & Shared",
                    icon: ClipboardList,
                    color: "blue",
                  },
                  {
                    id: "SALE_DONE",
                    label: "Sale Done",
                    icon: CheckCircle2,
                    color: "emerald",
                  },
                  {
                    id: "NOT_INTERESTED",
                    label: "Not Interested",
                    icon: XCircle,
                    color: "rose",
                  },
                ].map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOutcome(o.id as Outcome)}
                      className="w-full p-4 rounded-2xl border border-slate-200 active:bg-slate-50 flex items-center gap-3 text-left transition"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-${o.color}-100 text-${o.color}-700 grid place-items-center shrink-0`}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="font-semibold text-slate-800 flex-1">
                        {o.label}
                      </span>
                      <ArrowRight size={16} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {screen === 3 && (
              <>
                <Field label="Reason">
                  <Select
                    value={reason}
                    onValueChange={(v) => setReason(v as NotConnReason)}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SWITCHED_OFF">Switched Off</SelectItem>
                      <SelectItem value="NOT_REACHABLE">
                        Not Reachable
                      </SelectItem>
                      <SelectItem value="DNP">Did Not Pick (DNP)</SelectItem>
                      <SelectItem value="OTHERS">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {/* <WaRow value={whatsappSent} onChange={setWhatsappSent} /> */}
                <Field label="Comments" optional>
                  <Textarea
                    rows={3}
                    className="rounded-xl"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add notes…"
                  />
                </Field>
              </>
            )}

            {screen === 4 && (
              <>
                <Field label="Call Duration (seconds)">
                  <Input
                    type="number"
                    min="0"
                    className="h-12 rounded-xl text-base"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    placeholder="e.g. 45"
                  />
                </Field>
                <Field label="Follow-Up Date & Time">
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    className="h-12 rounded-xl text-base"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                </Field>
                {/* <WaRow value={whatsappSent} onChange={setWhatsappSent} /> */}
                <Field label="Comments" optional>
                  <Textarea
                    rows={3}
                    className="rounded-xl"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </Field>
              </>
            )}

            {screen === 5 && (
              <>
                <Field label="Session Date & Time">
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    className="h-12 rounded-xl text-base"
                    value={sessionAt}
                    onChange={(e) => setSessionAt(e.target.value)}
                  />
                </Field>
                <Field label="Meeting Platform">
                  <Select
                    value={platform}
                    onValueChange={(v) => setPlatform(v as MeetingPlatform)}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Choose platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                      <SelectItem value="ZOOM">Zoom</SelectItem>
                      <SelectItem value="PERSONAL">Personal Link</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {platform && (
                  <Field label="Meeting Link">
                    <div className="flex gap-2">
                      <Input
                        value={meetingLink}
                        readOnly
                        className="h-12 rounded-xl bg-slate-50 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-xl"
                        onClick={copyMeeting}
                        disabled={!meetingLink}
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                  </Field>
                )}
                {/* <WaRow value={whatsappSent} onChange={setWhatsappSent} /> */}
                <Field label="Comments" optional>
                  <Textarea
                    rows={3}
                    className="rounded-xl"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </Field>
              </>
            )}

            {screen === 6 && (
              <>
                <Field label="Quotation Title">
                  <Input
                    className="h-12 rounded-xl text-base"
                    value={quotationTitle}
                    onChange={(e) => setQuotationTitle(e.target.value)}
                    placeholder="e.g. Pro Plan – 12 months"
                  />
                </Field>
                <Field label="Quotation Value (₹)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    className="h-12 rounded-xl text-base"
                    value={quotationValue}
                    onChange={(e) => setQuotationValue(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Next Follow-Up Date & Time">
                  <Input
                    type="datetime-local"
                    min={nowLocalIso()}
                    className="h-12 rounded-xl text-base"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                </Field>
                <Field label="Comments" optional>
                  <Textarea
                    rows={3}
                    className="rounded-xl"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </Field>
              </>
            )}

            {screen === 7 && (
              <>
                <Field label="Project Name">
                  <Input
                    className="h-12 rounded-xl text-base"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Website Revamp"
                  />
                </Field>
                <Field label="Project Value (₹)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    className="h-12 rounded-xl text-base"
                    value={projectValue}
                    onChange={(e) => setProjectValue(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Sale Date">
                  <Input
                    type="date"
                    max={todayLocalIso()}
                    className="h-12 rounded-xl text-base"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </Field>
                <Field label="Service Brief">
                  <Textarea
                    rows={4}
                    className="rounded-xl"
                    value={serviceBrief}
                    onChange={(e) => setServiceBrief(e.target.value)}
                    placeholder="What was sold and any key terms"
                  />
                </Field>
              </>
            )}

            {screen === 8 && (
              <Field label="Comments">
                <Textarea
                  rows={4}
                  className="rounded-xl"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Why are they not interested?"
                />
              </Field>
            )}
          </div>

          {isSubmitScreen && (
            <div className="px-5 py-3 border-t bg-white shrink-0 flex gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <Button
                variant="outline"
                disabled={loading}
                onClick={close}
                className="h-12 rounded-xl flex-1 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={loading}
                className="h-12 rounded-xl flex-[2] font-bold text-base text-white bg-indigo-600 active:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                {loading ? "Saving..." : "Submit"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// helpers
function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-700">
        {label}{" "}
        {optional && (
          <span className="text-xs font-normal text-slate-400">(optional)</span>
        )}
      </Label>
      {children}
    </div>
  );
}
function WaRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 active:bg-slate-50 cursor-pointer">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-sm font-medium text-slate-700">
        Communication sent on WhatsApp
      </span>
    </label>
  );
}
