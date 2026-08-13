/**
 * Auth helpers for both User auth (admin) and Branch terminal auth (stock/sales).
 */
import { api } from "./api";

export interface UserToken { access_token: string; token_type: string; }

export interface BranchSession {
  access_token: string;
  token_type: string;
  branch_id: string;
  branch_name: string;
  message: string;
}

// How long before expiry (ms) to consider the token stale.
// We store the expiry timestamp at login time.
const EXPIRY_BUFFER_MS = 60_000; // 1 minute buffer

// ---- User (admin) login ----
export async function loginUser(email: string, password: string): Promise<UserToken> {
  const data = await api.post<UserToken>("/auth/login", { email, password });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("auth_type", "user");
  // Store expiry: server is configured to 480 min; we store a local timestamp
  // that is intentionally generous (24h) so the user is never kicked out mid-shift.
  // Real enforcement is the 401 interceptor in api.ts.
  localStorage.setItem("token_expiry", String(Date.now() + 24 * 60 * 60 * 1000));
  return data;
}

// ---- Branch terminal login ----
export async function loginBranch(
  branch_code: string,
  password: string,
): Promise<BranchSession> {
  const data = await api.post<BranchSession>("/branch-auth/login", {
    branch_code,
    password,
  });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("branch_id", data.branch_id);
  localStorage.setItem("branch_name", data.branch_name);
  localStorage.setItem("auth_type", "branch");
  // Same generous local expiry — 401 interceptor handles actual server expiry
  localStorage.setItem("token_expiry", String(Date.now() + 24 * 60 * 60 * 1000));
  return data;
}

export function logout() {
  ["access_token", "branch_id", "branch_name", "auth_type", "token_expiry"].forEach((k) =>
    localStorage.removeItem(k),
  );
  window.location.href = "/login";
}

/**
 * Returns true if the user has a stored token that hasn't locally expired.
 * The real guard is the 401 interceptor — this just avoids unnecessary page
 * flashes when the token is clearly gone.
 */
export function isTokenValid(): boolean {
  if (typeof window === "undefined") return false;
  const token  = localStorage.getItem("access_token");
  const expiry = localStorage.getItem("token_expiry");
  if (!token) return false;
  if (!expiry) return true; // legacy session — assume valid, let 401 handle it
  return Date.now() < Number(expiry) - EXPIRY_BUFFER_MS;
}

export function getBranchId(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("branch_id") : null;
}

export function getBranchName(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("branch_name") : null;
}

export function isLoggedIn(): boolean {
  return typeof window !== "undefined" && isTokenValid();
}
