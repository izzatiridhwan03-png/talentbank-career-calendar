import type { ReactNode } from "react";
import AuthGuard from "../components/AuthGuard";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
