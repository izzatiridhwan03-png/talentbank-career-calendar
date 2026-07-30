import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins, Bagel_Fat_One, Inter } from "next/font/google";
import "./globals.css";

const heading = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

const script = Bagel_Fat_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Talentbank Career Fair",
  description: "Career fair event calendar prototype.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${script.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
