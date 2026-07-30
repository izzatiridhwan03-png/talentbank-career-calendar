import type { ReactNode } from "react";
import AuthGuard from "../../components/AuthGuard";

export default function AdminEventDetailLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
