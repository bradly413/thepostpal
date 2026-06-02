"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PosterboyLogo from "@/components/PosterboyLogo";
import {
  safeRedirectPath,
  SIGNIN_NEXT_DEFAULT,
  SIGNUP_NEXT_DEFAULT,
} from "@/lib/safe-redirect";
import { getSelectedPlan, saveSelectedPlan } from "@/lib/plan-storage";
import {
  hasBrandBook,
  isOnboardingComplete,
} from "@/lib/onboarding-brand-sync";

type Mode = "login" | "signup";

export default function SignInPage() {
  return (
    <Suspense fallback={<div data-theme="light" className="min-h-dvh bg-bg" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeRedirectPath(
    searchParams.get("next"),
    SIGNIN_NEXT_DEFAULT,
  );

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
    saveSelectedPlan(searchParams.get("plan"));
  }, [searchParams]);

  function resolvePostAuthPath(): string {
    if (
      typeof window !== "undefined" &&
      !isOnboardingComplete() &&
      !hasBrandBook() &&
      !localStorage.getItem("posterboy-organization")
    ) {
      return "/onboarding";
    }
    return nextPath;
  }

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        router.push(resolvePostAuthPath());
      } else if (res.status >= 500) {
        setError(data?.error || "Could not sign in right now.");
        setLoading(false);
      } else {
        setError(data?.error || "Wrong email or password.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (!/[a-zA-Z]/.test(signupPassword) || !/[0-9]/.test(signupPassword)) {
      setError("Password must contain at least one letter and one number.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password: signupPassword,
          plan: getSelectedPlan(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem(
          "postpal-user",
          JSON.stringify({
            firstName,
            lastName,
            email,
            accountId: data.account?.id,
            accountName: data.account?.name,
          })
        );
        const afterSignup = safeRedirectPath(
          searchParams.get("next"),
          SIGNUP_NEXT_DEFAULT,
        );
        router.push(afterSignup);
      } else {
        setError(data.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-4 py-3 text-text placeholder:text-text-secondary/60 focus:border-text focus:outline-none focus:ring-2 focus:ring-text/10 transition-all text-[14px]";

  return (
    <div data-theme="light" className="min-h-dvh w-full bg-bg text-text flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 shrink-0">
        <PosterboyLogo href="/" size="header" className="text-text" />
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-text-secondary">
            {mode === "login" ? "New here?" : "Already have an account?"}
          </span>
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-text underline underline-offset-4 hover:no-underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>
      </header>

      {/* Center column */}
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 text-center">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-text font-heading leading-[1.1] tracking-tight">
              {mode === "login" ? "Sign in" : "Create your account"}
            </h1>
            <p className="mt-2 text-[14px] text-text-secondary">
              {mode === "login"
                ? "Your week is probably drafted. Go approve it."
                : "Create your account, then we'll set up your brand in a few minutes."}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <FieldLabel htmlFor="username">Email or username</FieldLabel>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email or username"
                autoComplete="username"
                spellCheck={false}
                className={inputClass}
                autoFocus
              />
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="Password"
                  autoComplete="current-password"
                  className={inputClass}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
              {error && <p className="text-danger text-[13px] text-center pt-1">{error}</p>}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="mt-2 w-full rounded-lg bg-text py-3 text-bg font-semibold text-[14px] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    aria-label="First name"
                    autoComplete="given-name"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    aria-label="Last name"
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </div>
              </div>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@brokerage.com"
                aria-label="Email address"
                autoComplete="email"
                className={inputClass}
              />
              <FieldLabel htmlFor="signupPassword">Password</FieldLabel>
              <div className="relative">
                <input
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 8 characters with a number"
                  aria-label="Create password"
                  autoComplete="new-password"
                  className={inputClass}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
              {error && <p className="text-danger text-[13px] text-center pt-1">{error}</p>}
              <button
                type="submit"
                disabled={loading || !firstName || !lastName || !email || !signupPassword}
                className="mt-2 w-full rounded-lg bg-text py-3 text-bg font-semibold text-[14px] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p className="pt-2 text-center text-[11px] text-text-secondary/70 leading-relaxed">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="underline">
                  terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  privacy policy
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="px-6 py-5 text-center text-[11px] text-text-secondary/60 shrink-0">
        Powered by Bradly Robert Creative
      </footer>
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12px] font-medium text-text-secondary mb-1">
      {children}
    </label>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle password visibility"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
    >
      {show ? (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );
}
