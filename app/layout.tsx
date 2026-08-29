import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murmur — DevSecOps Agent Swarm",
  description: "Human-in-the-loop correction propagation over BFS dependency graph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#000000", color: "#ffffff", fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
