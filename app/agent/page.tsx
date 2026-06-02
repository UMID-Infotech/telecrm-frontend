// teleCRM/app/agent/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Zap,
  CalendarCheck2,
  CalendarClock,
  RotateCcw,
  Search,
  AlertTriangle,
  PhoneOff,
  PhoneMissed,
  PhoneCall,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  currentJourneyStatus: string;
  createdAt: string;
  updatedAt: string;
  _count?: { conversations: number };
}

interface DashboardData {
  counts: {
    myAssignedLeads: number;
    todaysFollowUps: number;
    pendingCalls: number;
    convertedLeads: number;
    notConvertedLeads: number;
    reopenedLeads: number;
    callbackScheduledLeads: number;
    recentlyUpdatedTickets: number;
    overdueFollowUps: number;
  };
  kpis: {
    totalCallsToday: number;
    connectedCalls: number;
    conversionCount: number;
    conversionRatio: number;
    followUpsPending: number;
    overdueFollowUpsCount: number;
    averageResponseTime: number;
  };
  lists: {
    myAssignedLeads: Lead[];
    todaysFollowUps: Lead[];
    pendingCalls: Lead[];
    convertedLeads: Lead[];
    notConvertedLeads: Lead[];
    reopenedLeads: Lead[];
    callbackScheduledLeads: Lead[];
    recentlyUpdatedTickets: Lead[];
    overdueFollowUps: Lead[];
  };
}

type ListType = keyof DashboardData['lists'];

// CallDisposition matches Prisma enum exactly
type CallDisposition =
  | 'CONNECTED'
  | 'NOT_REACHABLE'
  | 'SWITCHED_OFF'
  | 'BUSY'
  | 'WRONG_NUMBER'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALLBACK_REQUESTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'CONVERTED';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityConfig: Record<
  'HIGH' | 'MEDIUM' | 'LOW',
  { cls: string; label: string }
> = {
  HIGH: {
    cls: 'bg-rose-50 text-rose-700 border-rose-100 font-semibold',
    label: 'High',
  },
  MEDIUM: {
    cls: 'bg-amber-50 text-amber-700 border-amber-100 font-semibold',
    label: 'Medium',
  },
  LOW: { cls: 'bg-slate-50 text-slate-600 border-slate-200', label: 'Low' },
};

const formatJourneyStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const callDispositionOptions: {
  value: CallDisposition;
  label: string;
  icon: React.ReactNode;
  cls: string;
}[] = [
  {
    value: 'CONNECTED',
    label: 'Connected',
    icon: <CheckCircle2 size={13} />,
    cls: 'text-emerald-700',
  },
  {
    value: 'NOT_REACHABLE',
    label: 'Not Reachable',
    icon: <PhoneOff size={13} />,
    cls: 'text-rose-700',
  },
  {
    value: 'SWITCHED_OFF',
    label: 'Switched Off',
    icon: <PhoneOff size={13} />,
    cls: 'text-rose-700',
  },
  {
    value: 'BUSY',
    label: 'Busy',
    icon: <PhoneMissed size={13} />,
    cls: 'text-amber-700',
  },
  {
    value: 'WRONG_NUMBER',
    label: 'Wrong Number',
    icon: <XCircle size={13} />,
    cls: 'text-slate-700',
  },
  {
    value: 'INTERESTED',
    label: 'Interested',
    icon: <TrendingUp size={13} />,
    cls: 'text-blue-700',
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Not Interested',
    icon: <XCircle size={13} />,
    cls: 'text-rose-700',
  },
  {
    value: 'CALLBACK_REQUESTED',
    label: 'Callback Requested',
    icon: <PhoneCall size={13} />,
    cls: 'text-purple-700',
  },
  {
    value: 'FOLLOW_UP_REQUIRED',
    label: 'Follow-Up Required',
    icon: <CalendarClock size={13} />,
    cls: 'text-indigo-700',
  },
];

const isConnectedDisposition = (d: CallDisposition) =>
  d === 'CONNECTED' ||
  d === 'INTERESTED' ||
  d === 'CALLBACK_REQUESTED' ||
  d === 'FOLLOW_UP_REQUIRED';

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<ListType>('myAssignedLeads');
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast, ToastComponent } = useToast();

  // Call Dialog State
  const [callDialog, setCallDialog] = useState<{
    open: boolean;
    lead: Lead | null;
    callType: 'SIM_CALL' | 'WHATSAPP_CALL';
  }>({ open: false, lead: null, callType: 'SIM_CALL' });
  const [disposition, setDisposition] = useState<CallDisposition>('CONNECTED');
  const [comment, setComment] = useState('');
  const [callDuration, setCallDuration] = useState<number>(30);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [callLoading, setCallLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const res = await api.get('/agent/dashboard');
      setData(res.data);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? 'Failed to load dashboard metrics',
        'destructive',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);


  const openCallDialog = (
    lead: Lead,
    callType: 'SIM_CALL' | 'WHATSAPP_CALL',
  ) => {
    setCallDialog({ open: true, lead, callType });
    setDisposition('CONNECTED');
    setComment('');
    setCallDuration(30);
    setRecordingUrl('');
  };

  const closeCallDialog = () => {
    setCallDialog({ open: false, lead: null, callType: 'SIM_CALL' });
  };

  const submitCall = async () => {
    if (!callDialog.lead) return;
    setCallLoading(true);
    try {
      // Determine statusAfter from disposition
      const statusAfter =
        disposition === 'CONNECTED' ||
        disposition === 'INTERESTED' ||
        disposition === 'CALLBACK_REQUESTED' ||
        disposition === 'FOLLOW_UP_REQUIRED'
          ? 'CONNECTED'
          : 'ATTEMPTED_CONTACT';

      await api.post('/agent/conversation', {
        leadId: callDialog.lead.id,
        type:
          callDialog.callType === 'SIM_CALL'
            ? 'CALL_LOG'
            : 'WHATSAPP_INTERACTION',
        callDisposition: disposition,
        callDuration: isConnectedDisposition(disposition)
          ? callDuration
          : undefined,
        recordingUrl: recordingUrl.trim() || undefined,
        notes: comment.trim() || undefined,
        statusAfter,
      });

      showToast('Interaction logged successfully', 'success');
      closeCallDialog();
      fetchDashboard();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ?? 'Failed to log call',
        'destructive',
      );
    } finally {
      setCallLoading(false);
    }
  };

  const getFilteredLeads = () => {
    if (!data) return [];
    const currentList = data.lists[activeList] || [];
    if (!searchQuery.trim()) return currentList;
    const query = searchQuery.toLowerCase();
    return currentList.filter(
      (l) => l.name.toLowerCase().includes(query) || l.phone.includes(query),
    );
  };

  const filteredLeads = getFilteredLeads();

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Agent Workspace
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              L3 Agent Console
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Monitor and manage your lead pipelines, follow-ups, and conversion
            metrics in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchDashboard}
            disabled={loading}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/leads/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
          >
            + Create New Lead
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          {
            label: 'Total Calls Today',
            value: data?.kpis.totalCallsToday ?? 0,
            icon: <Phone className="w-5 h-5" />,
            cls: 'from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-100/50',
          },
          {
            label: 'Connected Calls',
            value: data?.kpis.connectedCalls ?? 0,
            icon: <CheckCircle2 className="w-5 h-5" />,
            cls: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-100/50',
          },
          {
            label: 'Conversions',
            value: data?.kpis.conversionCount ?? 0,
            icon: <TrendingUp className="w-5 h-5" />,
            cls: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-100/50',
          },
          {
            label: 'Conversion Ratio',
            value: `${data?.kpis.conversionRatio ?? 0}%`,
            icon: <BarChart3 className="w-5 h-5" />,
            cls: 'from-purple-500/10 to-fuchsia-500/10 text-purple-700 border-purple-100/50',
          },
          {
            label: 'Follow-Ups Pending',
            value: data?.kpis.followUpsPending ?? 0,
            icon: <Clock className="w-5 h-5" />,
            cls: 'from-rose-500/10 to-pink-500/10 text-rose-700 border-rose-100/50',
          },
          {
            label: 'Overdue Follow-Ups',
            value: data?.kpis.overdueFollowUpsCount ?? 0,
            icon: <AlertTriangle className="w-5 h-5" />,
            cls: 'from-orange-500/10 to-red-500/10 text-orange-700 border-orange-100/50',
          },
          {
            label: 'Avg Response Time',
            value: `${data?.kpis.averageResponseTime ?? 0}m`,
            icon: <Zap className="w-5 h-5" />,
            cls: 'from-teal-500/10 to-cyan-500/10 text-teal-700 border-teal-100/50',
          },
        ].map((kpi, idx) => (
          <Card
            key={idx}
            className="overflow-hidden border border-slate-100 hover:shadow-md transition-all duration-300 relative group"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${kpi.cls} opacity-40`}
            />
            <CardContent className="p-4 relative flex flex-col justify-between h-24">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-semibold uppercase tracking-wider leading-tight">
                  {kpi.label}
                </span>
                <span className="p-1 rounded-lg bg-white/80 shadow-sm border border-slate-100/50 group-hover:scale-110 transition-transform">
                  {kpi.icon}
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {loading ? '...' : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bucket Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 px-1">
          <ClipboardList className="text-blue-600 w-5 h-5" />
          Lead Assignment Buckets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          {[
            {
              key: 'myAssignedLeads' as ListType,
              label: 'Assigned Leads',
              count: data?.counts.myAssignedLeads ?? 0,
              icon: <ClipboardList size={16} />,
              activeColor:
                'bg-blue-600 text-white ring-4 ring-blue-100 border-blue-600',
            },
            {
              key: 'todaysFollowUps' as ListType,
              label: "Today's Follow-Ups",
              count: data?.counts.todaysFollowUps ?? 0,
              icon: <CalendarCheck2 size={16} />,
              activeColor:
                'bg-emerald-600 text-white ring-4 ring-emerald-100 border-emerald-600',
            },
            {
              key: 'pendingCalls' as ListType,
              label: 'Pending Calls',
              count: data?.counts.pendingCalls ?? 0,
              icon: <Phone size={16} />,
              activeColor:
                'bg-indigo-600 text-white ring-4 ring-indigo-100 border-indigo-600',
            },
            {
              key: 'convertedLeads' as ListType,
              label: 'Converted',
              count: data?.counts.convertedLeads ?? 0,
              icon: <TrendingUp size={16} />,
              activeColor:
                'bg-amber-600 text-white ring-4 ring-amber-100 border-amber-600',
            },
            {
              key: 'notConvertedLeads' as ListType,
              label: 'Not Converted',
              count: data?.counts.notConvertedLeads ?? 0,
              icon: <XCircle size={16} />,
              activeColor:
                'bg-rose-600 text-white ring-4 ring-rose-100 border-rose-600',
            },
            {
              key: 'reopenedLeads' as ListType,
              label: 'Reopened',
              count: data?.counts.reopenedLeads ?? 0,
              icon: <RotateCcw size={16} />,
              activeColor:
                'bg-purple-600 text-white ring-4 ring-purple-100 border-purple-600',
            },
            {
              key: 'callbackScheduledLeads' as ListType,
              label: 'Callbacks Set',
              count: data?.counts.callbackScheduledLeads ?? 0,
              icon: <CalendarClock size={16} />,
              activeColor:
                'bg-cyan-600 text-white ring-4 ring-cyan-100 border-cyan-600',
            },
            {
              key: 'recentlyUpdatedTickets' as ListType,
              label: 'Recently Active',
              count: data?.counts.recentlyUpdatedTickets ?? 0,
              icon: <Clock size={16} />,
              activeColor:
                'bg-slate-800 text-white ring-4 ring-slate-200 border-slate-800',
            },
            {
              key: 'overdueFollowUps' as ListType,
              label: 'Overdue',
              count: data?.counts.overdueFollowUps ?? 0,
              icon: <AlertTriangle size={16} />,
              activeColor:
                'bg-orange-600 text-white ring-4 ring-orange-100 border-orange-600',
            },
          ].map((item) => {
            const isActive = activeList === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveList(item.key)}
                className={`p-3 rounded-xl border flex flex-col justify-between items-start text-left h-20 transition-all duration-300 shadow-sm hover:scale-[1.02] cursor-pointer ${
                  isActive
                    ? item.activeColor
                    : 'border-slate-100 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span
                    className={`truncate text-[11px] ${isActive ? 'text-white' : 'text-slate-600'}`}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className={`text-xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}
                >
                  {loading ? '...' : item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead List Card */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100/80 bg-slate-50/20 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Bucket:{' '}
              <span className="text-blue-600 font-extrabold">
                {activeList
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase())}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Log calls, manage schedules, and interact with leads from this
              list.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
              <p className="text-slate-400 text-sm font-medium">
                Loading workspace leads...
              </p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <ClipboardList
                size={48}
                className="mx-auto text-slate-300 stroke-[1.5] mb-3"
              />
              <p className="text-slate-800 font-bold text-base">
                No Leads Found
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {searchQuery
                  ? "We couldn't find any leads matching your search criteria."
                  : 'There are no active leads assigned in this bucket category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white border border-slate-100/90 rounded-2xl p-5 hover:shadow-md hover:border-slate-200/80 transition-all duration-300 flex flex-col justify-between h-[190px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-base leading-tight truncate">
                          {lead.name}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5 tracking-wider">
                          {lead.phone}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-[10px] shrink-0 ${priorityConfig[lead.priority].cls}`}
                      >
                        {priorityConfig[lead.priority].label}
                      </Badge>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 rounded-full font-medium text-[11px] px-2 py-0">
                      {formatJourneyStatus(lead.currentJourneyStatus)}
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-3 mt-auto">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(lead.updatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                      <Button
                        size="sm"
                        onClick={() => router.push(`/agent/leads/${lead.id}`)}
                        className="h-8 px-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold gap-1 flex items-center"
                      >
                        Details <ChevronRight size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Logging Dialog */}
      <Dialog
        open={callDialog.open}
        onOpenChange={(o) => !o && closeCallDialog()}
      >
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
              Log {callDialog.callType === 'SIM_CALL' ? 'SIM Call' : 'WhatsApp'}{' '}
              Interaction
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Logging activity for{' '}
              <strong className="text-slate-700 font-semibold">
                {callDialog.lead?.name}
              </strong>{' '}
              · {callDialog.lead?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Disposition */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">
                Call Disposition
              </Label>
              <Select
                value={disposition}
                onValueChange={(v) => setDisposition(v as CallDisposition)}
              >
                <SelectTrigger className="h-10 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {callDispositionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span
                        className={`flex items-center gap-2 font-medium ${opt.cls}`}
                      >
                        {opt.icon} {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration — only when connected */}
            {isConnectedDisposition(disposition) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-slate-700">
                    Call Duration (seconds)
                  </Label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {callDuration}s
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="3600"
                  value={callDuration}
                  onChange={(e) =>
                    setCallDuration(parseInt(e.target.value) || 0)
                  }
                  className="h-10"
                />
              </div>
            )}

            {/* Recording URL */}
            {isConnectedDisposition(disposition) && (
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">
                  Recording URL{' '}
                  <span className="text-muted-foreground font-normal text-xs">
                    (optional)
                  </span>
                </Label>
                <Input
                  type="text"
                  placeholder="https://storage.example.com/recording.mp3"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="h-10"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">
                Notes & Remarks{' '}
                <span className="text-muted-foreground font-normal text-xs">
                  (optional)
                </span>
              </Label>
              <Textarea
                placeholder="Describe customer response, follow-up intent, or concerns discussed..."
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
