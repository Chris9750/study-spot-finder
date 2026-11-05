import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, devLoginEnabled, providerList, signIn } from "@/auth";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied: "That account isn't allowed. Use your school email.",
  CredentialsSignin: "Enter a valid email address.",
  Configuration: "Sign-in isn't configured correctly on the server.",
};

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next ?? sp.callbackUrl?.replace(/^https?:\/\/[^/]+/, ""));
  if (await auth()) redirect(next);

  const domains = process.env.ALLOWED_EMAIL_DOMAINS?.trim();
  const oauth = providerList.filter((p) => p.id !== "dev-login");

  async function go(provider: string, formData?: FormData) {
    "use server";
    try {
      await signIn(provider, {
        redirectTo: next,
        ...(formData ? { email: formData.get("email"), name: formData.get("name") } : {}),
      });
    } catch (e) {
      // signIn() throws a redirect on success; only real auth errors land here.
      if (e instanceof AuthError) redirect(`/signin?error=${e.type}&next=${encodeURIComponent(next)}`);
      throw e;
    }
  }

  return (
    <div className="narrow">
      <div className="card form">
        <h1>Sign in</h1>
        <p className="muted">
          Sign in to rate spots, upload photos and add new places
          {domains ? <> (use your <strong>{domains}</strong> account)</> : null}.
        </p>
        {sp.error && <p className="error">{ERRORS[sp.error] ?? "Sign-in failed. Try again."}</p>}

        {oauth.map((p) => (
          <form key={p.id} action={go.bind(null, p.id)}>
            <button className="btn btn-wide">Continue with {p.id === "microsoft-entra-id" ? "Microsoft" : p.name}</button>
          </form>
        ))}

        {devLoginEnabled && (
          <form action={async (fd) => { "use server"; await go("dev-login", fd); }} className="form dev-login">
            <p className="muted small">
              <strong>Dev login</strong> (local only, turn off with AUTH_DEV_LOGIN=false)
            </p>
            <input name="email" type="email" required placeholder="you@queensu.ca" />
            <input name="name" placeholder="Display name" />
            <button className="btn">Sign in</button>
          </form>
        )}

        {!oauth.length && !devLoginEnabled && (
          <p className="error">
            No sign-in method is configured. Add Google or Microsoft keys to <code>.env.local</code>, or set{" "}
            <code>AUTH_DEV_LOGIN=true</code> for local testing.
          </p>
        )}
      </div>
    </div>
  );
}
