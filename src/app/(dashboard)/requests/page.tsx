import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const requests = await prisma.translationRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
          No translation requests yet.{" "}
          <Link href="/upload" className="text-blue-600 hover:text-blue-700">
            Submit your first video
          </Link>{" "}
          to get started.
        </div>
      ) : (
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
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {req.costEstimate != null ? `$${req.costEstimate.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {req.createdAt.toLocaleDateString()}
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
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    REJECTED: "bg-red-100 text-red-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
