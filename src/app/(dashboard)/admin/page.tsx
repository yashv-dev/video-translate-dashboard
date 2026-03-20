import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminRequestList from "./AdminRequestList";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [totalRequests, pendingRequests, completedRequests, rejectedRequests, totalUsers] = await Promise.all([
    prisma.translationRequest.count(),
    prisma.translationRequest.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.translationRequest.count({ where: { status: "COMPLETED" } }),
    prisma.translationRequest.count({ where: { status: "REJECTED" } }),
    prisma.user.count(),
  ]);

  const requests = await prisma.translationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Total</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalRequests}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingRequests}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Completed</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedRequests}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Rejected</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">{rejectedRequests}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Users</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalUsers}</p>
        </div>
      </div>

      <AdminRequestList
        initialRequests={requests.map((r) => ({
          id: r.id,
          userEmail: r.user.email,
          userName: r.user.name,
          videoUrl: r.videoUrl,
          sourceFileName: r.sourceFileName,
          targetLanguage: r.targetLanguage,
          lipSync: r.lipSync,
          status: r.status,
          costEstimate: r.costEstimate,
          outputUrl: r.outputUrl,
          progress: r.progress,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
