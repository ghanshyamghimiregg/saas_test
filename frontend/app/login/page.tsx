"use client";
import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginBranch, loginUser } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

// Redirect map — where to go after login based on app type
const REDIRECT: Record<string, string> = {
  stock: "/stock/inventory",
  sales: "/sales/pos",
  admin: "/admin/dashboard",
  branch: "/stock/inventory", // default branch landing
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const appParam = params.get("app") || "stock"; // stock | sales | admin

  const [mode, setMode] = useState<"branch" | "admin">(
    appParam === "admin" ? "admin" : "branch",
  );
  const [branchCode, setBranchCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "branch") {
        await loginBranch(branchCode.trim().toUpperCase(), password);
        // Redirect to the app they came from (sales → POS, stock → inventory)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-accent text-2xl font-bold tracking-tight">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="6" cy="12" r="4" />
              <circle cx="18" cy="12" r="4" />
              <path d="M10 12h4" />
            </svg>
            OptiStore
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "branch"
              ? appParam === "sales" ? "POS terminal login" : "Branch terminal login"
              : "Admin login"}
          </p>
        </div>

        <div className="card">
          <div className="flex rounded-lg border border-border p-1 mb-6 gap-1">
            {(["branch", "admin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === m
                    ? "bg-accent text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m === "branch" ? "Branch" : "Admin"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "branch" ? (
              <div>
                <label htmlFor="code" className="label">Branch code</label>
                <input
                  id="code"
                  className="input"
                  placeholder="e.g. MAINBR"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
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
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={4} /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Suspense required by Next.js 14 when using useSearchParams in a page
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-accent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
