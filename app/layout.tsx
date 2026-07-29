import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talentbank Career Fair",
  description: "Career fair event calendar prototype.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
