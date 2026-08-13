"use client";
import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginBranch, loginUser } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

const REDIRECT: Record<string, string> = {
  stock:  "/stock/inventory",
  sales:  "/sales/pos",
  admin:  "/admin/dashboard",
  branch: "/stock/inventory",
};

function LoginForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const appParam = params.get("app") || "stock";

  const [mode,       setMode]       = useState<"branch" | "admin">(appParam === "admin" ? "admin" : "branch");
  const [branchCode, setBranchCode] = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "branch") {
        await loginBranch(branchCode.trim().toUpperCase(), password);
        router.push(REDIRECT[appParam] ?? "/stock/inventory");
      } else {
        await loginUser(email.trim(), password);
        router.push("/admin/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const isBranch = mode === "branch";

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5 mb-3">
            <svg
              width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="#4f46e5" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6"  cy="12" r="4"/>
              <circle cx="18" cy="12" r="4"/>
              <path d="M10 12h4"/>
            </svg>
            <span className="text-xl font-semibold tracking-tight text-ink">Chasma Pasal</span>
          </div>
          <p className="text-sm text-ink-muted">
            {isBranch
              ? (appParam === "sales" ? "POS terminal" : "Branch terminal")
              : "Admin"}
          </p>
        </div>

        {/* Card */}
        <div className="card-flat shadow-modal">

          {/* Mode toggle */}
          <div
            role="tablist"
            aria-label="Login mode"
            className="flex rounded-md border border-border p-1 mb-5 gap-1 bg-canvas"
          >
            {(["branch", "admin"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null); }}
                className={[
                  "flex-1 py-1.5 rounded text-xs font-medium transition-colors duration-150",
                  mode === m
                    ? "bg-white text-ink shadow-card"
                    : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {m === "branch" ? "Branch" : "Admin"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isBranch ? (
              <div>
                <label htmlFor="branch-code" className="label">Branch code</label>
                <input
                  id="branch-code"
                  className="input font-mono tracking-widest uppercase"
                  placeholder="e.g. MAINBR"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div role="alert" className="alert-error text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-1"
              disabled={loading}
            >
              {loading ? <Spinner size={4} /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={6} label="Loading…" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
