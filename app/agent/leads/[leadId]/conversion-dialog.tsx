// teleCRM/app/agent/leads/[leadId]/conversion-dialog.tsx
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
import { TrendingUp, ShieldAlert } from "lucide-react";

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

  // Conversion fields
  const [conversionValue, setConversionValue] = useState("");
  const [productSelected, setProductSelected] = useState("");

  // Closure / loss fields
  const [lossReason, setLossReason] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [closureNotes, setClosureNotes] = useState("");

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
        setConversionValue("");
        setProductSelected("");
        setLossReason("");
        setCompetitor("");
        setClosureNotes("");
      }, 800);
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

  return (
    <>
      {ToastComponent}
      <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
        <DialogContent
          className="
            w-[95vw] max-w-[95vw] sm:max-w-md
            max-h-[90vh] overflow-y-auto
            p-4 sm:p-6
            rounded-xl
          "
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {isConverted ? (
                <>
                  <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">
                    Celebrate Conversion!
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <span className="text-rose-700">Lead Closure Details</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              Update details for <span className="font-medium">{leadName}</span>{" "}
              before locking the status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 sm:py-4">
            {isConverted ? (
              // ── CONVERSION FORM ───────────────────────────────────────────
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="conversion-value"
                    className="text-sm font-medium"
                  >
                    Deal Value (₹)
                  </Label>
                  <Input
                    id="conversion-value"
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 25000"
                    value={conversionValue}
                    onChange={(e) => setConversionValue(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="product-selected"
                    className="text-sm font-medium"
                  >
                    Product / Service Selected
                  </Label>
                  <Input
                    id="product-selected"
                    placeholder="e.g. Premium Plan"
                    value={productSelected}
                    onChange={(e) => setProductSelected(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </>
            ) : (
              // ── CLOSURE FORM ──────────────────────────────────────────────
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Closure Reason</Label>
                  <Select value={lossReason} onValueChange={setLossReason}>
                    <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm focus:ring-rose-500 focus:border-rose-500">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
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
                      <SelectItem value="NO_RESPONSE">
                        No Response / Ghosted
                      </SelectItem>
                      <SelectItem value="MISSING_FEATURES">
                        Product Features Missing
                      </SelectItem>
                      <SelectItem value="OTHER">Other Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competitor" className="text-sm font-medium">
                    Competitor Chosen (optional)
                  </Label>
                  <Input
                    id="competitor"
                    placeholder="e.g. ABC Corp"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="closure-notes"
                    className="text-sm font-medium"
                  >
                    Closure Notes (optional)
                  </Label>
                  <Textarea
                    id="closure-notes"
                    placeholder="Add any additional context..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    rows={3}
                    className="resize-none text-base sm:text-sm focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-11 sm:h-10 border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full sm:w-auto h-11 sm:h-10 font-medium shadow-md ${
                isConverted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100 hover:shadow-emerald-200"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100 hover:shadow-rose-200"
              }`}
            >
              {loading
                ? "Submitting..."
                : isConverted
                  ? "Complete Conversion"
                  : "Close Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
