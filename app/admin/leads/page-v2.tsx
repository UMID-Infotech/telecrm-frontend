//teleCRM/app/admin/leads/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Lead {
  id: string;
  name: string;
  phone: string;
  approvalStatus: string;
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const leadsRes = await apiFetch('/leads');
    const deptRes = await apiFetch('/departments');

    setLeads(leadsRes);
    setDepartments(deptRes);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Approve Lead
  const approveLead = async (leadId: string) => {
    await apiFetch(`/leads/${leadId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
      }),
    });

    fetchData();
  };

  // ✅ Assign Department
  const assignDepartment = async (leadId: string) => {
    const departmentId = selectedDept[leadId];

    if (!departmentId) {
      alert('Select department');
      return;
    }

    await apiFetch('/leads/assign-department', {
      method: 'POST',
      body: JSON.stringify({
        leadId,
        departmentId,
      }),
    });

    alert('Department assigned');

    fetchData();
  };

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Leads Management
      </h1>

      <table className="w-full border">

        <thead>
          <tr className="border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Status</th>
            <th className="p-2">Department</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>

        <tbody>

          {leads.map((lead) => (

            <tr key={lead.id} className="border-b">

              <td className="p-2">
                {lead.name}
              </td>

              <td className="p-2">
                {lead.phone}
              </td>

              <td className="p-2">
                {lead.approvalStatus}
              </td>

              <td className="p-2">

                <select
                  className="border rounded px-2 py-1"
                  value={selectedDept[lead.id] || ''}
                  onChange={(e) =>
                    setSelectedDept({
                      ...selectedDept,
                      [lead.id]: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select
                  </option>

                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}

                </select>

              </td>

              <td className="p-2 flex gap-2">

                {/* Approve Button */}
                {lead.approvalStatus === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => approveLead(lead.id)}
                  >
                    Approve
                  </Button>
                )}

                {/* Assign Department */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => assignDepartment(lead.id)}
                >
                  Assign
                </Button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}
