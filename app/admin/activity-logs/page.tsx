// telecrm-frontend/app/admin/activity-logs/page.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ActivityLog {
  timestamp: string;

  userId?: string;
  userName?: string;
  role?: string;

  action: string;

  entity?: string;
  entityId?: string;

  details?: Record<string, any>;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const response = await api.get("/activity-logs");

      setLogs(response.data || []);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to load activity logs",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        Loading activity logs...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Activity Logs
          </h1>

          <p className="text-sm text-gray-500">
            Audit trail of user activities
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 rounded bg-red-50 border border-red-200 text-red-600 p-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left border">
                Timestamp
              </th>

              <th className="px-4 py-3 text-left border">
                User
              </th>

              <th className="px-4 py-3 text-left border">
                Role
              </th>

              <th className="px-4 py-3 text-left border">
                Action
              </th>

              <th className="px-4 py-3 text-left border">
                Entity
              </th>

              <th className="px-4 py-3 text-left border">
                Entity Id
              </th>

              <th className="px-4 py-3 text-left border">
                Details
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-10 text-gray-500"
                >
                  No activity logs found
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr
                  key={`${log.timestamp}-${index}`}
                  className="hover:bg-gray-50"
                >
                  <td className="border px-4 py-2 whitespace-nowrap">
                    {new Date(
                      log.timestamp,
                    ).toLocaleString()}
                  </td>

                  <td className="border px-4 py-2">
                    {log.userName ||
                      log.userId ||
                      "-"}
                  </td>

                  <td className="border px-4 py-2">
                    {log.role || "-"}
                  </td>

                  <td className="border px-4 py-2">
                    <span className="font-medium">
                      {log.action}
                    </span>
                  </td>

                  <td className="border px-4 py-2">
                    {log.entity || "-"}
                  </td>

                  <td className="border px-4 py-2">
                    {log.entityId || "-"}
                  </td>

                  <td className="border px-4 py-2">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(
                        log.details || {},
                        null,
                        2,
                      )}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}