"use client";

import { useState, useEffect, useRef } from "react";

type Request = {
  id: string;
  videoUrl: string;
  sourceFileName: string | null;
  targetLanguage: string;
  lipSync: boolean;
  status: string;
  costEstimate: number | null;
  progress: number | null;
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

export default function UserRequestList({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasProcessingJobs = requests.some((r) => r.status === "PROCESSING");

  // Auto-refresh every 30s when there are processing jobs
  useEffect(() => {
    if (!hasProcessingJobs) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/translation-requests?status=PROCESSING");
        if (!res.ok) return;
        const data = await res.json();
        if (data.requests) {
          setRequests((prev) =>
            prev.map((r) => {
              const updated = data.requests.find((u: { id: string }) => u.id === r.id);
              if (updated) {
                return {
                  ...r,
                  status: updated.status,
                  progress: updated.progress,
                  outputUrl: updated.outputUrl || r.outputUrl,
                };
              }
              return r;
            })
          );
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    intervalRef.current = setInterval(poll, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasProcessingJobs]);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lip Sync</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Est.</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Download</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                {req.sourceFileName || req.videoUrl}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{req.targetLanguage}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{req.lipSync ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                {req.status === "PROCESSING" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${req.progress ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-purple-600 font-medium whitespace-nowrap">
                      {req.progress != null ? `${req.progress}%` : "Processing..."}
                    </span>
                  </div>
                ) : (
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusStyles[req.status] || "bg-gray-100 text-gray-800"}`}>
                    {req.status.replace(/_/g, " ")}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {req.costEstimate != null ? `$${req.costEstimate.toFixed(2)}` : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(req.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {req.status === "COMPLETED" && req.outputUrl ? (
                  <a
                    href={req.outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 inline-block transition-colors"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
