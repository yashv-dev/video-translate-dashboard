"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const userLinks = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/upload", label: "Upload Video", icon: "📤" },
  { href: "/requests", label: "My Requests", icon: "📋" },
];

const adminLinks = [
  { href: "/admin", label: "Admin Dashboard", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const links = isAdmin ? [...userLinks, ...adminLinks] : userLinks;

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Video Translate</h1>
        <p className="text-sm text-gray-400 mt-1 truncate">{session?.user?.email}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md text-left"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
