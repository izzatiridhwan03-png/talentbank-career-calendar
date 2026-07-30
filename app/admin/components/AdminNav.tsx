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
    <nav className="flex flex-wrap items-center justify-between gap-3 bg-white border-b border-brand-sage/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-script text-2xl text-brand-brown">Talentbank</span>
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="text-sm font-semibold text-brand-brown hover:text-brand-brown/70"
        >
          Dashboard
        </button>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md bg-brand-brown px-3 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-browndark"
      >
        Logout
      </button>
    </nav>
  );
}
