"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
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
      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError("Wrong username or password.");
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

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
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
        }),
      });

      if (res.ok) {
        localStorage.setItem(
          "postpal-user",
          JSON.stringify({ firstName, lastName, email })
        );
        router.push("/onboarding");
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors text-sm";

  return (
    <div className="flex flex-1 items-center justify-center px-4 bg-bg login-bg">
      <div className="w-full max-w-sm">
        <img
          src="/logos/thepostpal-white.png"
          alt="thepostpal"
          className="mx-auto -mb-12 h-56 w-auto"
        />
        <p className="text-text-secondary text-sm mb-8 text-center">
          your ai social media assistant
        </p>

        {/* Tabs */}
        <div className="flex mb-6 rounded-xl bg-surface/50 border border-border p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "login"
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-text-secondary hover:text-text border border-transparent"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              mode === "signup"
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-text-secondary hover:text-text border border-transparent"
            }`}
          >
            Create Account
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              aria-label="Username"
              autoComplete="username"
              spellCheck={false}
              className={inputClass}
              autoFocus
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                className={inputClass}
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
            {error && <p className="text-danger text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full rounded-full bg-accent py-3 text-bg font-semibold text-sm transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                aria-label="First name"
                autoComplete="given-name"
                className={inputClass}
                autoFocus
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                aria-label="Last name"
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Create password"
                aria-label="Create password"
                autoComplete="new-password"
                className={inputClass}
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
            {error && <p className="text-danger text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !firstName || !lastName || !email || !signupPassword}
              className="w-full rounded-full bg-accent py-3 text-bg font-semibold text-sm transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-text-secondary/40 text-center">
          Powered by Bradly Robert Creative
        </p>
      </div>
    </div>
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
