// teleCRM/components/agent/for-mobile/conversion-dialog.tsx
"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { TrendingUp, ShieldAlert, PartyPopper, X } from "lucide-react";

interface ConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "CONVERTED" | "LOST" | "NOT_INTERESTED" | null;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

export function ConversionDialog({
  open,
  onOpenChange,
  status,
  leadId,
  leadName,
  onSuccess,
}: ConversionDialogProps) {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);

  const [conversionValue, setConversionValue] = useState("");
  const [productSelected, setProductSelected] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [closureNotes, setClosureNotes] = useState("");

  const resetState = () => {
    setConversionValue("");
    setProductSelected("");
    setLossReason("");
    setCompetitor("");
    setClosureNotes("");
  };

  const handleSubmit = async () => {
    if (!status) return;
    setLoading(true);
    try {
      if (status === "CONVERTED") {
        const val = parseFloat(conversionValue);
        if (isNaN(val) || val <= 0) {
          showToast("Please enter a valid conversion amount", "destructive");
          setLoading(false);
          return;
        }
        if (!productSelected.trim()) {
          showToast(
            "Please specify the product or service selected",
            "destructive",
          );
          setLoading(false);
          return;
        }
        await api.post("/agent/conversation", {
          leadId,
          type: "STATUS_CHANGE",
          statusAfter: "CONVERTED",
          conversionValue: val,
          productSelected: productSelected.trim(),
          notes: `Lead converted. Product: ${productSelected.trim()}, Value: ₹${val}`,
        });
      } else {
        if (!lossReason) {
          showToast("Please select a closure or loss reason", "destructive");
          setLoading(false);
          return;
        }
        await api.post("/agent/conversation", {
          leadId,
          type: "STATUS_CHANGE",
          statusAfter: status,
          lossReason,
          competitor: competitor.trim() || undefined,
          closureNotes: closureNotes.trim() || undefined,
          notes: `Lead marked as ${
            status === "LOST" ? "Lost" : "Not Interested"
          }. Reason: ${lossReason}.${
            closureNotes.trim() ? ` Notes: ${closureNotes.trim()}` : ""
          }`,
        });
      }

      showToast("Lead status updated successfully", "success");
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetState();
      }, 600);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? "Failed to update lead status",
        "destructive",
      );
    } finally {
      setLoading(false);
    }
  };

  const isConverted = status === "CONVERTED";
  const accent = isConverted ? "emerald" : "rose";

  return (
    <>
      {ToastComponent}
      <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
        {/* Bottom-sheet on mobile, centered card on desktop */}
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
          {/* Grab handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-200" />
          </div>

          {/* Header */}
          <DialogHeader
            className={`px-5 pt-3 pb-4 text-left border-b shrink-0 ${
              isConverted
                ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
                : "bg-gradient-to-br from-rose-50 to-white border-rose-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isConverted
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {isConverted ? (
                  <PartyPopper size={20} />
                ) : (
                  <ShieldAlert size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle
                  className={`text-lg font-extrabold tracking-tight ${
                    isConverted ? "text-emerald-900" : "text-rose-900"
                  }`}
                >
                  {isConverted ? "Celebrate Conversion!" : "Close This Lead"}
                </DialogTitle>
                <DialogDescription className="text-slate-600 text-sm mt-1 font-medium break-words">
                  Update details for{" "}
                  <span className="font-bold text-slate-800">{leadName}</span>{" "}
                  before locking the status.
                </DialogDescription>
              </div>
              <button
                onClick={() => !loading && onOpenChange(false)}
                className="w-9 h-9 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </DialogHeader>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {isConverted ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Deal Value (₹)
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="e.g. 25000"
                    value={conversionValue}
                    onChange={(e) => setConversionValue(e.target.value)}
                    className="h-12 text-base rounded-xl focus:ring-emerald-500 focus:border-emerald-500 w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product / Service Selected
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Premium Plan – Annual"
                    value={productSelected}
                    onChange={(e) => setProductSelected(e.target.value)}
                    className="h-12 text-base rounded-xl focus:ring-emerald-500 focus:border-emerald-500 w-full"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Closure Reason
                  </Label>
                  <Select value={lossReason} onValueChange={setLossReason}>
                    <SelectTrigger className="h-12 text-base rounded-xl focus:ring-rose-500 focus:border-rose-500 w-full">
                      <SelectValue placeholder="Pick a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH_PRICING">
                        High Pricing / Budget Constraints
                      </SelectItem>
                      <SelectItem value="COMPETITOR">
                        Went with Competitor
                      </SelectItem>
                      <SelectItem value="NOT_INTERESTED">
                        Not Interested / Spam
                      </SelectItem>
                      <SelectItem value="WRONG_CONTACT">
                        Wrong Contact Information
                      </SelectItem>
                      <SelectItem value="GHOSTED">
                        No Response / Ghosted
                      </SelectItem>
                      <SelectItem value="MISSING_FEATURES">
                        Product Features Missing
                      </SelectItem>
                      <SelectItem value="OTHER">Other Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Competitor Chosen{" "}
                    <span className="text-slate-400 font-medium normal-case">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. CompetitorX"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    className="h-12 text-base rounded-xl focus:ring-rose-500 focus:border-rose-500 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Closure Notes{" "}
                    <span className="text-slate-400 font-medium normal-case">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    placeholder="Any final context to record..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    rows={4}
                    className="resize-none text-base rounded-xl focus:ring-rose-500 focus:border-rose-500 w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Sticky footer */}
          <DialogFooter
            className="px-5 py-3 border-t bg-white shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3
                       pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          >
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-12 sm:h-11 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full sm:flex-1 h-12 sm:h-11 rounded-xl font-bold text-base shadow-md text-white transition-all active:scale-[0.99] ${
                isConverted
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
              }`}
            >
              {loading
                ? "Submitting..."
                : isConverted
                  ? "🎉 Complete Conversion"
                  : "Close Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
