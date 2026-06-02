//teleCRM/app/leads/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function LeadListPage() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const data = await apiFetch('/leads');
    setLeads(data);
  };

  const approve = async (id: string) => {
    await apiFetch(`/leads/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
      }),
    });

    fetchLeads();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leads</h1>

      {leads.map((lead: any) => (
        <div key={lead.id} className="border p-4 rounded">
          <p>
            {lead.name} — {lead.phone}
          </p>
          <p>Status: {lead.approvalStatus}</p>

          {lead.approvalStatus === 'PENDING' && (
            <Button onClick={() => approve(lead.id)}>Approve</Button>
          )}
        </div>
      ))}
    </div>
  );
}
