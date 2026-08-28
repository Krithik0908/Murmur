import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murmur — Live Correction Propagation for DevSecOps Agent Swarms",
  description:
    "When a human corrects one agent mid-pipeline, Murmur selectively re-runs only the downstream agents whose reasoning depended on it — no full restart.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
