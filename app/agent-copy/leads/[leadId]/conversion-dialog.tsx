// teleCRM/app/agent/leads/[leadId]/conversion-dialog.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { TrendingUp, Trash2, ShieldAlert } from 'lucide-react';

interface ConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'CONVERTED' | 'LOST' | 'NOT_INTERESTED' | null;
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
  const [conversionValue, setConversionValue] = useState<string>('');
  const [productSelected, setProductSelected] = useState<string>('');

  // Loss fields
  const [lossReason, setLossReason] = useState<string>('');
  const [competitor, setCompetitor] = useState<string>('');
  const [closureNotes, setClosureNotes] = useState<string>('');

  const handleSubmit = async () => {
    if (!status) return;
    setLoading(true);

    try {
      if (status === 'CONVERTED') {
        const val = parseFloat(conversionValue);
        if (isNaN(val) || val <= 0) {
          showToast('Please enter a valid conversion amount', 'destructive');
          setLoading(false);
          return;
        }
        if (!productSelected.trim()) {
          showToast('Please specify the product or service selected', 'destructive');
          setLoading(false);
          return;
        }

        await api.post('/agent/conversation', {
          leadId,
          type: 'STATUS_CHANGE',
          statusAfter: 'CONVERTED',
          conversionValue: val,
          productSelected: productSelected.trim(),
          notes: `Converted lead for ${productSelected.trim()} with value of $${val}`,
        });
      } else {
        // LOST or NOT_INTERESTED
        if (!lossReason) {
          showToast('Please select a closure or loss reason', 'destructive');
          setLoading(false);
          return;
        }

        await api.post('/agent/conversation', {
          leadId,
          type: 'STATUS_CHANGE',
          statusAfter: status,
          lossReason,
          competitor: competitor.trim() || undefined,
          closureNotes: closureNotes.trim() || undefined,
          notes: `Lead marked as ${status === 'LOST' ? 'Lost' : 'Not Interested'}. Reason: ${lossReason}. Notes: ${closureNotes.trim() || 'None'}`,
        });
      }

      showToast('Lead status updated successfully', 'success');
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        // Reset states
        setConversionValue('');
        setProductSelected('');
        setLossReason('');
        setCompetitor('');
        setClosureNotes('');
      }, 800);
    } catch (err: any) {
      console.error(err);
      showToast(
        err?.response?.data?.message ?? 'Failed to update lead status',
        'destructive',
      );
    } finally {
      setLoading(false);
    }
  };

  const isConverted = status === 'CONVERTED';

  return (
    <>
      {ToastComponent}
      <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
        <DialogContent className="max-w-md border-slate-100 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {isConverted ? (
                <>
                  <TrendingUp className="text-emerald-500 w-6 h-6 animate-bounce" />
                  <span className="bg-emerald-50 text-emerald-800 text-sm px-2.5 py-0.5 rounded-full font-semibold">
                    Celebrate Conversion!
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="text-rose-500 w-6 h-6" />
                  <span className="bg-rose-50 text-rose-800 text-sm px-2.5 py-0.5 rounded-full font-semibold">
                    Lead Closure Details
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Update details for <strong className="text-slate-800 font-semibold">{leadName}</strong> before locking the status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isConverted ? (
              // ─── CONVERSION FORM ──────────────────────────────────────────
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="conversionValue" className="font-semibold text-slate-700">
                    Deal Value ($)
                  </Label>
                  <Input
                    id="conversionValue"
                    type="number"
                    min="1"
                    placeholder="Enter total contract or conversion value..."
                    value={conversionValue}
                    onChange={(e) => setConversionValue(e.target.value)}
                    className="h-10 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="productSelected" className="font-semibold text-slate-700">
                    Product / Service Selected
                  </Label>
                  <Input
                    id="productSelected"
                    type="text"
                    placeholder="e.g. Enterprise License, Starter Plan"
                    value={productSelected}
                    onChange={(e) => setProductSelected(e.target.value)}
                    className="h-10 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </>
            ) : (
              // ─── NON-CONVERSION / CLOSURE FORM ───────────────────────────
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="lossReason" className="font-semibold text-slate-700">
                    Closure Reason
                  </Label>
                  <Select value={lossReason} onValueChange={setLossReason}>
                    <SelectTrigger className="h-10 focus:ring-rose-500 focus:border-rose-500">
                      <SelectValue placeholder="Select why this lead closed..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High Pricing / Budget Constraints">High Pricing / Budget Constraints</SelectItem>
                      <SelectItem value="Went with Competitor">Went with Competitor</SelectItem>
                      <SelectItem value="Not Interested / Spam">Not Interested / Spam</SelectItem>
                      <SelectItem value="Wrong Contact Information">Wrong Contact Information</SelectItem>
                      <SelectItem value="No Response / Ghosted">No Response / Ghosted</SelectItem>
                      <SelectItem value="Product Features Missing">Product Features Missing</SelectItem>
                      <SelectItem value="Other Reason">Other Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="competitor" className="font-semibold text-slate-700">
                    Competitor Chosen <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="competitor"
                    type="text"
                    placeholder="e.g. HubSpot, Salesforce"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    className="h-10 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="closureNotes" className="font-semibold text-slate-700">
                    Closure Notes / Remarks <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="closureNotes"
                    placeholder="Provide additional details regarding the non-conversion or loss..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    rows={3}
                    className="resize-none focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={
                isConverted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-emerald-100 hover:shadow-emerald-200 shadow-md'
                  : 'bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-rose-100 hover:shadow-rose-200 shadow-md'
              }
            >
              {loading ? 'Submitting...' : isConverted ? 'Complete Conversion' : 'Close Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
