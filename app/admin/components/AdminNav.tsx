"use client";

import { useRouter } from "next/navigation";

const STORAGE_KEY = "isAdminLoggedIn";

export default function AdminNav() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    router.push("/admin/login");
  };

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="text-sm font-semibold text-slate-900 hover:text-slate-700"
        >
          Dashboard
        </button>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Logout
      </button>
    </nav>
  );
}
