import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import { voucherTerms } from "@/lib/commerce";

/*
 * Sign in / create account.
 *
 * The left half of this page was a dark panel with a four-colour gradient,
 * a shopping-bag emoji as a logo, and four emoji bullets, one of which read
 * "☁️ Media hosted on Cloudinary, data on Supabase" — our hosting choices,
 * presented to a customer as a benefit of signing up. The panel is now a
 * short, honest list of what an account does, in the same icon set as the
 * rest of the site.
 *
 * The form gained what it was missing: a password visibility toggle, a real
 * label association, `aria-invalid` on the field that failed, and a single
 * focusable error message rather than a colour change.
 */
export function AuthPage() {
  const { session } = useShop();
  const config = usePublishedConfig();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [invalid, setInvalid] = useState<"email" | "password" | null>(null);

  const brand = config.branding.companyName;

  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInvalid("email");
      setNotice("Enter a valid email address.");
      document.getElementById("auth-email")?.focus();
      return;
    }
    if (password.length < 8) {
      setInvalid("password");
      setNotice("Use a password with at least 8 characters.");
      document.getElementById("auth-password")?.focus();
      return;
    }
    setInvalid(null);
    setBusy(true);
    setNotice("");
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = create
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) navigate(admin ? "/admin" : "/account");
      else {
        setCreate(false);
        setPassword("");
        setNotice("Check your email, confirm the account, then sign in here.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const benefits = [
    { icon: "swap", text: "One cart and wishlist across this site and the app" },
    { icon: "box", text: "Order history and delivery status in one place" },
    { icon: "ticket", text: voucherTerms() },
    { icon: "message", text: "Message the store and read replies" },
  ];

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-md border border-line bg-raised lg:grid-cols-2">
      <div className="hidden flex-col justify-center gap-6 border-r border-line bg-sunken p-8 lg:flex">
        <div>
          <h2 className="text-2xl font-semibold text-ink">One account, both apps</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in once and {brand} keeps everything in step.
          </p>
        </div>
        <ul className="space-y-3.5">
          {benefits.map((b) => (
            <li key={b.text} className="flex items-start gap-3 text-sm text-ink-soft">
              <Icon name={b.icon} size={18} className="mt-0.5 shrink-0 text-brand" />
              {b.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">
          {admin ? "Staff sign in" : create ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {admin
            ? "Staff email and password for the store dashboard."
            : `Sign in to order from ${brand}.`}
        </p>

        {session ? (
          <button
            type="button"
            onClick={() => navigate(admin ? "/admin" : "/account")}
            className="mt-6 w-full rounded-md bg-brand py-3 text-base font-semibold text-white hover:bg-brand-strong"
          >
            Go to {admin ? "the dashboard" : "my account"}
          </button>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-ink">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                aria-invalid={invalid === "email"}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-md border bg-raised px-3 py-2.5 text-base text-ink outline-none focus:border-brand ${
                  invalid === "email" ? "border-critical" : "border-line"
                }`}
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={reveal ? "text" : "password"}
                  autoComplete={create ? "new-password" : "current-password"}
                  value={password}
                  aria-invalid={invalid === "password"}
                  aria-describedby="auth-password-hint"
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-md border bg-raised px-3 py-2.5 pr-11 text-base text-ink outline-none focus:border-brand ${
                    invalid === "password" ? "border-critical" : "border-line"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-sm text-ink-muted hover:text-ink"
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
              {create && (
                <p id="auth-password-hint" className="mt-1 text-xs text-ink-muted">
                  At least 8 characters.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
            >
              {busy ? "Please wait…" : create ? "Create account" : "Sign in"}
            </button>

            {!admin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCreate((v) => !v);
                  setNotice("");
                  setInvalid(null);
                }}
                className="w-full rounded-md border border-line py-3 text-base font-semibold text-ink hover:border-brand hover:text-brand"
              >
                {create ? "I already have an account" : "Create an account"}
              </button>
            )}
          </form>
        )}

        <div aria-live="assertive">
          {notice && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-caution/30 bg-caution-soft px-3 py-2.5 text-sm text-caution"
            >
              <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
              {notice}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
          <button
            type="button"
            onClick={() => {
              setAdmin((v) => !v);
              setCreate(false);
              setNotice("");
              setInvalid(null);
            }}
            className="font-medium text-brand hover:text-brand-strong"
          >
            {admin ? "Customer sign-in" : "Staff sign-in"}
          </button>
          <Link to="/" className="text-ink-muted hover:text-ink">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
