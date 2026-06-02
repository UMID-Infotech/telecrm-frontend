// teleCRM/app/admin/leads/page.tsx
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  phone: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  distributionStage: 'L1_POOL' | 'L2_POOL' | 'AGENT_OWNED' | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  teamId?: string;
  team?: { id: string; name: string };
  createdByUser?: { email: string };
  createdByRole: string;
}

interface Team {
  id: string;
  name: string;
  manager: { email: string; designation: string };
  department?: { name: string };
  _count: { members: number };
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
const approvalBadge = (status: Lead['approvalStatus']) => {
  const map: Record<Lead['approvalStatus'], 'default' | 'destructive' | 'secondary' | 'outline'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    REJECTED: 'destructive',
  };
  return <Badge variant={map[status]}>{status}</Badge>;
};

const stageBadge = (stage: Lead['distributionStage']) => {
  if (!stage) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<NonNullable<Lead['distributionStage']>, string> = {
    L1_POOL: 'bg-yellow-100 text-yellow-800',
    L2_POOL: 'bg-blue-100 text-blue-800',
    AGENT_OWNED: 'bg-green-100 text-green-800',
  };
  const labels: Record<NonNullable<Lead['distributionStage']>, string> = {
    L1_POOL: 'L1 Pool',
    L2_POOL: 'Team Pool',
    AGENT_OWNED: 'Assigned',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[stage]}`}>
      {labels[stage]}
    </span>
  );
};

const priorityBadge = (p: Lead['priority']) => {
  const map: Record<Lead['priority'], string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-orange-100 text-orange-700',
    LOW: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[p]}`}>
      {p}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'L1_POOL'>('ALL');

  // Approval reject dialog
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; leadId: string }>({
    open: false,
    leadId: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  // Distribution dialog
  const [distDialog, setDistDialog] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [distMode, setDistMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [distTeamId, setDistTeamId] = useState('');
  const [distLoading, setDistLoading] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, teamsRes] = await Promise.all([
        api.get('/leads'),
        api.get('/leads/distribution/teams'),
      ]);
      setLeads(leadsRes.data?.data ?? leadsRes.data ?? []);
      setTeams(teamsRes.data?.data ?? teamsRes.data ?? []);
    } catch {
      showToast('Failed to load data', 'destructive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered leads by tab ────────────────────────────────────────────────
  const displayedLeads = leads.filter((l) => {
    if (activeTab === 'PENDING') return l.approvalStatus === 'PENDING';
    if (activeTab === 'L1_POOL') return l.distributionStage === 'L1_POOL';
    return true;
  });

  // ── Approve ───────────────────────────────────────────────────────────────
  const approveLead = async (leadId: string) => {
    try {
      await api.patch(`/leads/${leadId}/approve`, { status: 'APPROVED' });
      showToast('Lead approved and moved to L1 Pool', 'success');
      fetchData();
    } catch {
      showToast('Approval failed', 'destructive');
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const confirmReject = async () => {
    try {
      await api.patch(`/leads/${rejectDialog.leadId}/approve`, {
        status: 'REJECTED',
        rejectionReason: rejectReason,
      });
      showToast('Lead rejected', 'default');
      setRejectDialog({ open: false, leadId: '' });
      setRejectReason('');
      fetchData();
    } catch {
      showToast('Rejection failed', 'destructive');
    }
  };

  // ── Distribution ──────────────────────────────────────────────────────────
  const toggleLeadSelect = (id: string) =>
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const openDistDialog = () => {
    if (selectedLeadIds.length === 0) {
      showToast('Select at least one lead from L1 Pool to distribute', 'destructive');
      return;
    }
    setDistDialog(true);
  };

  const distribute = async () => {
    if (distMode === 'MANUAL' && !distTeamId) {
      showToast('Select a team for manual distribution', 'destructive');
      return;
    }
    setDistLoading(true);
    try {
      const payload: any = { leadIds: selectedLeadIds, mode: distMode };
      if (distMode === 'MANUAL') payload.teamId = distTeamId;

      await api.post('/leads/distribute/team', payload);
      showToast(`${selectedLeadIds.length} lead(s) distributed to team`, 'success');
      setDistDialog(false);
      setSelectedLeadIds([]);
      setDistTeamId('');
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Distribution failed', 'destructive');
    } finally {
      setDistLoading(false);
    }
  };

  const l1PoolLeads = leads.filter((l) => l.distributionStage === 'L1_POOL');

  return (
    <div className="p-6 space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Approve leads and distribute them to teams (L1 → L2 pipeline)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/admin/leads/create'}>
            + New Lead
          </Button>
          {selectedLeadIds.length > 0 && (
            <Button onClick={openDistDialog}>
              Distribute ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: leads.length, cls: 'bg-slate-50' },
          { label: 'Pending Approval', count: leads.filter(l => l.approvalStatus === 'PENDING').length, cls: 'bg-yellow-50' },
          { label: 'L1 Pool (Ready)', count: l1PoolLeads.length, cls: 'bg-blue-50' },
          { label: 'Distributed', count: leads.filter(l => l.distributionStage === 'L2_POOL' || l.distributionStage === 'AGENT_OWNED').length, cls: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['ALL', 'PENDING', 'L1_POOL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'ALL' ? 'All Leads' : tab === 'PENDING' ? 'Needs Approval' : 'L1 Pool (Distributable)'}
          </button>
        ))}
      </div>

      {/* Distribution info banner */}
      {activeTab === 'L1_POOL' && l1PoolLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-blue-800">
            ✓ Select leads below and click <strong>Distribute</strong> to assign them to teams
          </p>
          {selectedLeadIds.length > 0 && (
            <Button size="sm" onClick={openDistDialog}>
              Distribute Selected ({selectedLeadIds.length})
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {activeTab === 'L1_POOL' && <TableHead className="w-10"></TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              displayedLeads.map((lead) => (
                <TableRow key={lead.id} className={selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}>
                  {activeTab === 'L1_POOL' && (
                    <TableCell>
                      {lead.distributionStage === 'L1_POOL' && (
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLeadSelect(lead.id)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{priorityBadge(lead.priority)}</TableCell>
                  <TableCell>{approvalBadge(lead.approvalStatus)}</TableCell>
                  <TableCell>{stageBadge(lead.distributionStage)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.createdByUser?.email?.split('@')[0]} ({lead.createdByRole})
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.team?.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {lead.approvalStatus === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => approveLead(lead.id)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectDialog({ open: true, leadId: lead.id })}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {lead.distributionStage === 'L1_POOL' && activeTab !== 'L1_POOL' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeadIds([lead.id]);
                            setActiveTab('L1_POOL');
                          }}
                        >
                          Distribute
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, leadId: rejectDialog.leadId })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Lead</DialogTitle>
            <DialogDescription>Provide a reason for rejection (optional)</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, leadId: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribute to Team</DialogTitle>
            <DialogDescription>
              Distributing {selectedLeadIds.length} lead(s) — L1 Pool → Team Pool
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Distribution Mode</label>
              <Select value={distMode} onValueChange={(v) => setDistMode(v as 'MANUAL' | 'AUTO')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual — pick a team</SelectItem>
                  <SelectItem value="AUTO">Auto — round-robin by priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distMode === 'MANUAL' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Team</label>
                <Select value={distTeamId} onValueChange={setDistTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.manager?.email?.split('@')[0]} ({t._count?.members} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={distribute} disabled={distLoading}>
              {distLoading ? 'Distributing…' : 'Distribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
