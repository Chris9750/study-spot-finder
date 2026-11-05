import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Spot Finder",
  description: "Find quiet, connected, uncrowded places to study on campus.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>◐</span> Study Spot Finder
          </Link>
          <Link href="/spots/new" className="btn btn-primary">
            + Add a spot
          </Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
