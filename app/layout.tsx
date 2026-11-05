import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Spot Finder",
  description: "Find quiet, connected, uncrowded places to study on campus.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>◐</span> Study Spot Finder
          </Link>
          <nav className="topnav">
            {user?.isAdmin && (
              <Link href="/admin" className="navlink">
                Moderation
              </Link>
            )}
            <Link href="/spots/new" className="btn btn-primary">
              + Add a spot
            </Link>
            {user ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="btn btn-ghost" title={user.email ?? undefined}>
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/signin" className="btn btn-ghost">
                Sign in
              </Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
