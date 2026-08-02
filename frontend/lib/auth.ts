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

// ---- User (admin) login ----
export async function loginUser(email: string, password: string): Promise<UserToken> {
  const data = await api.post<UserToken>("/auth/login", { email, password });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("auth_type", "user");
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
  // Store JWT so every subsequent api.* call sends Authorization: Bearer
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("branch_id", data.branch_id);
  localStorage.setItem("branch_name", data.branch_name);
  localStorage.setItem("auth_type", "branch");
  return data;
}

export function logout() {
  ["access_token", "branch_id", "branch_name", "auth_type"].forEach((k) =>
    localStorage.removeItem(k),
  );
  window.location.href = "/login";
}

export function getBranchId(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("branch_id") : null;
}

export function getBranchName(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("branch_name") : null;
}

export function isLoggedIn(): boolean {
  return typeof window !== "undefined" &&
    (!!localStorage.getItem("access_token") || !!localStorage.getItem("branch_id"));
}
