// teleCRM/app/agent/leads/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Eye,
  CalendarClock,
  Search,
  Filter,
  ArrowUpDown,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadJourneyStatus =
  | 'FRESH_LEAD'
  | 'ATTEMPTED_CONTACT'
  | 'CONNECTED'
  | 'QUALIFIED'
  | 'INTERESTED'
  | 'FOLLOW_UP_SCHEDULED'
  | 'NEGOTIATION'
  | 'DOCUMENTATION_PENDING'
  | 'CONVERTED'
  | 'LOST'
  | 'NOT_INTERESTED'
  | 'DUPLICATE'
  | 'INVALID_LEAD';

interface Lead {
  id: string;
  name: string;
  phone: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  distributionStage: string | null;
  currentJourneyStatus: LeadJourneyStatus;
  createdAt: string;
  updatedAt: string;
  team?: { name: string } | null;
  conversations?: { id: string; type: string; createdAt: string }[];
  followUps?: { id: string; status: string; followUpAt: string }[];
}

type CallType = 'SIM_CALL' | 'WHATSAPP_CALL';
type CallOutcome = 'CONNECTED' | 'NOT_CONNECTED';

type ActiveTab =
  | 'ALL'
  | 'BUCKET'
  | 'TODAY'
  | 'PENDING_CALLS'
  | 'CONVERTED'
  | 'LOST'
  | 'CALLBACK'
  | 'PENDING_APPROVAL';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityConfig: Record<Lead['priority'], { cls: string; label: string }> = {
  HIGH: { cls: 'bg-rose-50 text-rose-700 border-rose-100 font-semibold', label: 'High' },
  MEDIUM: { cls: 'bg-amber-50 text-amber-700 border-amber-100 font-semibold', label: 'Medium' },
  LOW: { cls: 'bg-slate-50 text-slate-650 border-slate-200', label: 'Low' },
};

const journeyStatusCls: Record<LeadJourneyStatus, string> = {
  FRESH_LEAD: 'bg-slate-100 text-slate-700 border-slate-200/80',
  ATTEMPTED_CONTACT: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  CONNECTED: 'bg-blue-50 text-blue-700 border-blue-100',
  QUALIFIED: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  INTERESTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  FOLLOW_UP_SCHEDULED: 'bg-purple-50 text-purple-700 border-purple-100',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-100',
  DOCUMENTATION_PENDING: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  CONVERTED: 'bg-teal-50 text-teal-700 border-teal-100 font-bold',
  LOST: 'bg-rose-50 text-rose-700 border-rose-100',
  NOT_INTERESTED: 'bg-red-50 text-red-650 border-red-100',
  DUPLICATE: 'bg-slate-50 text-slate-500 border-slate-200',
  INVALID_LEAD: 'bg-slate-50 text-slate-500 border-slate-200',
};

const formatJourneyStatus = (status: string) => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentLeadsPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL');

  // Search and priority filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ── Call dialog state ──────────────────────────────────────
  const [callDialog, setCallDialog] = useState<{
    open: boolean;
    lead: Lead | null;
    callType: CallType;
  }>({ open: false, lead: null, callType: 'SIM_CALL' });

  const [outcome, setOutcome] = useState<CallOutcome>('CONNECTED');
  const [comment, setComment] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [callLoading, setCallLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/agent/leads');
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? 'Failed to load assigned leads',
        'destructive',
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Call dialog handlers ────────────────────────────────────

  const openCallDialog = (lead: Lead, callType: CallType) => {
    setCallDialog({ open: true, lead, callType });
    setOutcome('CONNECTED');
    setComment('');
    setDuration(30);
  };

  const closeCallDialog = () => {
    setCallDialog({ open: false, lead: null, callType: 'SIM_CALL' });
  };

  const submitCall = async () => {
    if (!callDialog.lead) return;
    setCallLoading(true);

    try {
      await api.post('/agent/conversation', {
        leadId: callDialog.lead.id,
        type: callDialog.callType === 'SIM_CALL' ? 'CALL_LOG' : 'WHATSAPP_INTERACTION',
        callOutcome: outcome,
        notes: comment.trim() || undefined,
        duration,
        statusAfter: outcome === 'CONNECTED' ? 'CONNECTED' : 'ATTEMPTED_CONTACT',
      });

      showToast('Call logged successfully', 'success');
      closeCallDialog();
      fetchLeads();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? 'Failed to log call',
        'destructive',
      );
    } finally {
      setCallLoading(false);
    }
  };

  // ── Filter and sorting calculations ──────────────────────────

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const getFilteredLeads = () => {
    // 1. First apply tab filters
    let list = [...leads];
    if (activeTab === 'BUCKET') {
      list = list.filter((l) => l.distributionStage === 'AGENT_OWNED' && l.approvalStatus !== 'PENDING');
    } else if (activeTab === 'TODAY') {
      list = list.filter((l) =>
        (l.followUps ?? []).some(
          (f) => f.status === 'PENDING' && isToday(f.followUpAt),
        ),
      );
    } else if (activeTab === 'PENDING_CALLS') {
      const activeCallingStatuses = [
        'FRESH_LEAD',
        'ATTEMPTED_CONTACT',
        'CONNECTED',
        'QUALIFIED',
        'INTERESTED',
        'FOLLOW_UP_SCHEDULED',
        'NEGOTIATION',
        'DOCUMENTATION_PENDING',
      ];
      list = list.filter((l) => activeCallingStatuses.includes(l.currentJourneyStatus));
    } else if (activeTab === 'CONVERTED') {
      list = list.filter((l) => l.currentJourneyStatus === 'CONVERTED');
    } else if (activeTab === 'LOST') {
      list = list.filter((l) => l.currentJourneyStatus === 'LOST' || l.currentJourneyStatus === 'NOT_INTERESTED');
    } else if (activeTab === 'CALLBACK') {
      list = list.filter((l) => l.currentJourneyStatus === 'FOLLOW_UP_SCHEDULED' || (l.followUps ?? []).some((f) => f.status === 'PENDING'));
    } else if (activeTab === 'PENDING_APPROVAL') {
      list = list.filter((l) => l.approvalStatus === 'PENDING');
    }

    // 2. Apply search queries
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q),
      );
    }

    // 3. Apply priority filters
    if (priorityFilter !== 'ALL') {
      list = list.filter((l) => l.priority === priorityFilter);
    }

    // 4. Apply sorting
    list.sort((a, b) => {
      let multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      } else if (sortBy === 'priority') {
        const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (priorityWeight[a.priority] - priorityWeight[b.priority]) * multiplier;
      } else {
        // default sorting by updated date
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * multiplier;
      }
    });

    return list;
  };

  const displayedLeads = getFilteredLeads();

  const toggleSort = (field: 'name' | 'priority' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // ── Tab calculation numbers ──────────────────────────────────
  const countAll = leads.length;
  const countBucket = leads.filter((l) => l.distributionStage === 'AGENT_OWNED' && l.approvalStatus !== 'PENDING').length;
  const countToday = leads.filter((l) => (l.followUps ?? []).some((f) => f.status === 'PENDING' && isToday(f.followUpAt))).length;
  const countCalls = leads.filter((l) => [
    'FRESH_LEAD',
    'ATTEMPTED_CONTACT',
    'CONNECTED',
    'QUALIFIED',
    'INTERESTED',
    'FOLLOW_UP_SCHEDULED',
    'NEGOTIATION',
    'DOCUMENTATION_PENDING',
  ].includes(l.currentJourneyStatus)).length;
  const countConverted = leads.filter((l) => l.currentJourneyStatus === 'CONVERTED').length;
  const countLost = leads.filter((l) => l.currentJourneyStatus === 'LOST' || l.currentJourneyStatus === 'NOT_INTERESTED').length;
  const countCallbacks = leads.filter((l) => l.currentJourneyStatus === 'FOLLOW_UP_SCHEDULED' || (l.followUps ?? []).some((f) => f.status === 'PENDING')).length;
  const countPending = leads.filter((l) => l.approvalStatus === 'PENDING').length;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {ToastComponent}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Leads Workspace
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Search, sort, log calls, and keep track of your active lead interactions here.
          </p>
        </div>
        <Button
          onClick={() => router.push('/leads/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
        >
          + Create New Lead
        </Button>
      </div>

      {/* Dynamic Tabs Filters */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { key: 'ALL' as const, label: 'All Leads', count: countAll },
          { key: 'BUCKET' as const, label: 'My Bucket', count: countBucket },
          { key: 'TODAY' as const, label: "Today's Follow-Ups", count: countToday },
          { key: 'PENDING_CALLS' as const, label: 'Pending Calls', count: countCalls },
          { key: 'CONVERTED' as const, label: 'Converted', count: countConverted },
          { key: 'LOST' as const, label: 'Lost / Closed', count: countLost },
          { key: 'CALLBACK' as const, label: 'Callbacks', count: countCallbacks },
          { key: 'PENDING_APPROVAL' as const, label: 'Pending Approval', count: countPending },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 bg-white border border-slate-100'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action panel: search + priority filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <Input
            type="text"
            placeholder="Search by lead name or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 focus:ring-blue-500 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <Filter size={12} />
            Priority:
          </span>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-36 h-10 rounded-xl border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="HIGH">High Priority</SelectItem>
              <SelectItem value="MEDIUM">Medium Priority</SelectItem>
              <SelectItem value="LOW">Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Fetching lead workspace...</p>
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-800 text-base">No Leads in Category</p>
            <p className="text-slate-400 text-xs mt-1">
              There are no leads matching your selected filters or search parameters in this workspace tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3.5 font-semibold text-slate-700 text-left">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      Lead Name
                      <ArrowUpDown size={12} />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <button
                      onClick={() => toggleSort('priority')}
                      className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      Priority
                      <ArrowUpDown size={12} />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">Journey Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Pending Follow-ups</TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <button
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      Last Active
                      <ArrowUpDown size={12} />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLeads.map((lead) => {
                  const pendingFollowUps = (lead.followUps ?? []).filter(
                    (f) => f.status === 'PENDING',
                  );

                  return (
                    <TableRow
                      key={lead.id}
                      className="hover:bg-slate-50/40 transition-colors border-b border-slate-100"
                    >
                      {/* Name */}
                      <TableCell className="py-4 font-bold text-slate-800">
                        {lead.name}
                        {lead.approvalStatus === 'PENDING' && (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] px-2 py-0 border border-amber-200">
                            <AlertCircle size={10} /> Pending L1
                          </span>
                        )}
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="font-mono text-sm text-slate-500 font-medium">
                        {lead.phone}
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 text-[10px] ${
                            priorityConfig[lead.priority].cls
                          }`}
                        >
                          {priorityConfig[lead.priority].label}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            journeyStatusCls[lead.currentJourneyStatus] ??
                            'bg-slate-50 text-slate-650'
                          }`}
                        >
                          {formatJourneyStatus(lead.currentJourneyStatus)}
                        </Badge>
                      </TableCell>

                      {/* Pending Follow-ups */}
                      <TableCell>
                        {pendingFollowUps.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            <CalendarClock size={11} />
                            {pendingFollowUps.length} pending
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Last Active */}
                      <TableCell className="text-slate-500 font-medium text-xs">
                        {new Date(lead.updatedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.approvalStatus === 'APPROVED' &&
                            lead.distributionStage === 'AGENT_OWNED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCallDialog(lead, 'SIM_CALL')}
                                  className="h-8 w-8 p-0 rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50"
                                  title="Log SIM Call"
                                >
                                  <Phone size={13} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCallDialog(lead, 'WHATSAPP_CALL')}
                                  className="h-8 w-8 p-0 rounded-lg border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                  title="Log WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                </Button>
                              </>
                            )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/agent/leads/${lead.id}`)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="View Full Journey Timeline"
                          >
                            <Eye size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Call Logger Dialog */}
      <Dialog open={callDialog.open} onOpenChange={(o) => !o && closeCallDialog()}>
        <DialogContent className="max-w-md border-slate-100 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-lg">
              {callDialog.callType === 'SIM_CALL' ? (
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                  <Phone size={18} />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <MessageCircle size={18} />
                </div>
              )}
              <span>
                Log {callDialog.callType === 'SIM_CALL' ? 'SIM Call' : 'WhatsApp'} Interaction
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Logging activity for <strong className="text-slate-700 font-semibold">{callDialog.lead?.name}</strong> · {callDialog.lead?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
                <SelectTrigger className="h-10 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONNECTED">
                    <span className="flex items-center gap-2 font-medium text-emerald-700">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Connected
                    </span>
                  </SelectItem>
                  <SelectItem value="NOT_CONNECTED">
                    <span className="flex items-center gap-2 font-medium text-rose-700">
                      <XCircle size={14} className="text-rose-500" />
                      Not Connected
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {outcome === 'CONNECTED' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-slate-700">Call Duration (seconds)</Label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {duration}s
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="3600"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">
                Notes & Remarks <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Interaction notes..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeCallDialog}
              disabled={callLoading}
              className="border-slate-200 font-medium text-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={submitCall}
              disabled={callLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              {callLoading ? 'Logging...' : 'Save Interaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
