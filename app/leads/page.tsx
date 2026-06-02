// teleCRM/app/leads/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

interface Lead {
  id: string;
  name: string;
  phone: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  distributionStage: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

const priorityCls: Record<Lead['priority'], string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-gray-100 text-gray-600',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const router = useRouter();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads');
      setLeads(res.data?.data ?? res.data ?? []);
    } catch {
      showToast('Failed to load leads', 'destructive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <div className="p-6 space-y-6">
      {ToastComponent}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <Button onClick={() => router.push('/leads/create')}>+ Create Lead</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No leads yet
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityCls[lead.priority]}`}>
                      {lead.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.approvalStatus === 'APPROVED' ? 'default' : lead.approvalStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {lead.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
