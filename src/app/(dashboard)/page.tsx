import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    redirect("/admin");
  }

  const [total, pending, completed] = await Promise.all([
    prisma.translationRequest.count({ where: { userId: session.user.id } }),
    prisma.translationRequest.count({ where: { userId: session.user.id, status: "PENDING_APPROVAL" } }),
    prisma.translationRequest.count({ where: { userId: session.user.id, status: "COMPLETED" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{pending}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{completed}</p>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-gray-500 mb-4">Welcome, {session.user.name || session.user.email}!</p>
        <Link
          href="/upload"
          className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload a Video
        </Link>
      </div>
    </div>
  );
}
