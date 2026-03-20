import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import UserRequestList from "./UserRequestList";

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
        <UserRequestList
          initialRequests={requests.map((r) => ({
            id: r.id,
            videoUrl: r.videoUrl,
            sourceFileName: r.sourceFileName,
            targetLanguage: r.targetLanguage,
            lipSync: r.lipSync,
            status: r.status,
            costEstimate: r.costEstimate,
            progress: r.progress,
            outputUrl: r.outputUrl,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
