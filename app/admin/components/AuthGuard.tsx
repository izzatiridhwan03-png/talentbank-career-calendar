"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "isAdminLoggedIn";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem(STORAGE_KEY) === "true";
    if (!isLoggedIn) {
      router.replace("/admin/login");
      return;
    }
    setIsReady(true);
  }, [router]);

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-brown">Loading...</div>;
  }

  return <>{children}</>;
}
