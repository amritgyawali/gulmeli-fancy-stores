import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { supabase } from "@/lib/supabase";

export function AuthPage() {
  const { session } = useShop();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotice("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setNotice("Use a password with at least 8 characters.");
      return;
    }
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
        setNotice(
          "Check your email and confirm your account, then return here to sign in.",
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-0 overflow-hidden rounded-2xl bg-[var(--store-surface)] shadow-lg lg:grid-cols-[1fr_440px]">
      {/* Marketing panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#161616] via-[#1c1d22] to-[#3a1d05] p-10 text-white lg:flex">
        <div>
          <span className="text-3xl">🛍️</span>
          <h2 className="mt-4 text-3xl font-black leading-tight">
            One account.
            <br />
            Every device.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Your cart, wishlist, profile and orders stay in perfect sync between
            this website and the Gulmeli mobile app — live, in seconds.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-white/85">
          {[
            ["📦", "Cash on delivery across Nepal"],
            ["🎫", "GULMELI10 → 10% off Rs. 500+ (max Rs. 100)"],
            ["💎", "Daily check-in gems and voucher drops"],
            ["☁️", "Media hosted on Cloudinary, data on Supabase"],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--store-surface)]/10">
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="p-8 lg:p-10">
        <h1 className="text-2xl font-black">
          {admin ? "Admin sign in" : create ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-[var(--store-muted)]">
          {admin
            ? "Enter your staff email and password to open the store dashboard."
            : "Sign in to save your profile and place orders with Gulmeli Fancy Stores."}
        </p>
        {session ? (
          <button
            onClick={() => navigate(admin ? "/admin" : "/account")}
            className="mt-6 w-full rounded-xl bg-[var(--store-primary)] py-3 text-sm font-bold text-white"
          >
            Go to {admin ? "dashboard" : "my account"}
          </button>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[var(--store-muted)]">Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--store-primary)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[var(--store-muted)]">Password</span>
              <input
                type="password"
                autoComplete={create ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--store-primary)]"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[var(--store-primary)] py-3 text-sm font-bold text-white hover:bg-[#e14d05] disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : admin
                  ? "Admin sign in"
                  : create
                    ? "Create account"
                    : "Sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCreate(!create);
                setNotice("");
              }}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600"
            >
              {create ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        )}
        {notice && (
          <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            {notice}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <button
            onClick={() => {
              setAdmin(!admin);
              setCreate(false);
              setNotice("");
            }}
            className="font-bold text-[var(--store-primary-text)]"
          >
            {admin ? "← Back to customer sign-in" : "Admin login"}
          </button>
          <Link to="/" className="font-semibold text-[var(--store-muted)] hover:text-[var(--store-text)]">
            Continue shopping →
          </Link>
        </div>
      </div>
    </div>
  );
}
