"use client";

import { useState } from "react";

type Request = {
  id: string;
  userEmail: string;
  userName: string | null;
  videoUrl: string;
  sourceFileName: string | null;
  targetLanguage: string;
  lipSync: boolean;
  status: string;
  costEstimate: number | null;
  outputUrl: string | null;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function AdminRequestList({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<string>("all");
  const [processing, setProcessing] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const filteredRequests = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || `Failed to ${action} request`);
        return;
      }

      const data = await res.json();
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: data.request.status } : r
        )
      );
    } catch {
      alert(`Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  const handleProcess = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/requests/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to submit to HeyGen");
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "PROCESSING" } : r
        )
      );
    } catch {
      alert("Failed to submit to HeyGen");
    } finally {
      setProcessing(null);
    }
  };

  const handlePollAll = async () => {
    setPolling(true);
    try {
      const res = await fetch("/api/admin/requests/poll", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to poll status");
        return;
      }

      const data = await res.json();
      if (data.results) {
        setRequests((prev) =>
          prev.map((r) => {
            const result = data.results.find((res: { id: string }) => res.id === r.id);
            if (result) {
              return {
                ...r,
                status: result.status === "completed" ? "COMPLETED" : result.status === "failed" ? "FAILED" : r.status,
                outputUrl: result.outputUrl || r.outputUrl,
              };
            }
            return r;
          })
        );
      }
    } catch {
      alert("Failed to poll status");
    } finally {
      setPolling(false);
    }
  };

  const hasProcessingJobs = requests.some((r) => r.status === "PROCESSING");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Translation Requests</h2>
        <div className="flex items-center gap-3">
          {hasProcessingJobs && (
            <button
              onClick={handlePollAll}
              disabled={polling}
              className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {polling ? "Polling..." : "Check HeyGen Status"}
            </button>
          )}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { value: "all", label: "All" },
              { value: "PENDING_APPROVAL", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "PROCESSING", label: "Processing" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === f.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
          No requests found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lip Sync</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Est.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>{req.userName || "—"}</div>
                    <div className="text-xs text-gray-500">{req.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                    {req.sourceFileName || req.videoUrl}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{req.targetLanguage}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{req.lipSync ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {req.costEstimate != null ? `$${req.costEstimate.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      statusStyles[req.status] || "bg-gray-100 text-gray-800"
                    }`}>
                      {req.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {req.status === "PENDING_APPROVAL" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(req.id, "approve")}
                          disabled={processing === req.id}
                          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                        >
                          {processing === req.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "reject")}
                          disabled={processing === req.id}
                          className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                        >
                          {processing === req.id ? "..." : "Reject"}
                        </button>
                      </div>
                    )}
                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => handleProcess(req.id)}
                        disabled={processing === req.id}
                        className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                      >
                        {processing === req.id ? "Sending..." : "Send to HeyGen"}
                      </button>
                    )}
                    {req.status === "PROCESSING" && (
                      <span className="text-xs text-purple-600 font-medium">Processing...</span>
                    )}
                    {req.status === "COMPLETED" && req.outputUrl && (
                      <a
                        href={req.outputUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 inline-block transition-colors"
                      >
                        Download
                      </a>
                    )}
                    {(req.status === "REJECTED" || req.status === "FAILED") && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
