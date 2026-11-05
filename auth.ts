import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { query } from "@/lib/db";

// Comma-separated, e.g. "queensu.ca". Empty = any account can sign in.
const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// Comma-separated emails that can moderate (see /admin).
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  return !!email && adminEmails.includes(email.toLowerCase());
}

export function emailAllowed(email?: string | null) {
  if (!email) return false;
  if (!allowedDomains.length) return true;
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Only on when explicitly enabled, and never in production builds.
export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID) {
  providers.push(
    Google({
      // Hint Google to show only school accounts when one domain is allowed.
      authorization: allowedDomains.length === 1 ? { params: { hd: allowedDomains[0] } } : undefined,
    }),
  );
}

if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(MicrosoftEntraID({}));
}

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: { label: "Email" }, name: { label: "Name" } },
      authorize(c) {
        const email = String(c?.email ?? "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        return { id: email, email, name: String(c?.name ?? "").trim() || email.split("@")[0] };
      },
    }),
  );
}

export const providerList = providers.map((p) => {
  const cfg = typeof p === "function" ? p() : p;
  return { id: cfg.id, name: cfg.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    signIn({ user }) {
      return emailAllowed(user.email);
    },
    async jwt({ token, user }) {
      // First sign-in in this session: create/update our users row.
      if (user?.email) {
        const [row] = await query<{ id: number }>(
          `INSERT INTO users (email, name, image) VALUES (lower($1), $2, $3)
           ON CONFLICT (email) DO UPDATE
             SET name = COALESCE(EXCLUDED.name, users.name),
                 image = COALESCE(EXCLUDED.image, users.image),
                 last_login = now()
           RETURNING id`,
          [user.email, user.name ?? null, user.image ?? null],
        );
        token.uid = row.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? "");
        session.user.isAdmin = isAdminEmail(session.user.email);
      }
      return session;
    },
  },
});
