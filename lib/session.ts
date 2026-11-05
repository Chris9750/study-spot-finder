import { auth } from "@/auth";

export type CurrentUser = { id: number; email: string; name: string; isAdmin: boolean };

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const u = session?.user;
  const id = Number(u?.id);
  if (!u?.email || !Number.isInteger(id) || id <= 0) return null;
  return { id, email: u.email, name: u.name ?? u.email.split("@")[0], isAdmin: !!u.isAdmin };
}

export const signInRequired = () =>
  Response.json({ error: "Sign in to do that." }, { status: 401 });
