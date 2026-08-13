/**
 * Thin fetch wrapper. Reads token from localStorage (key: "access_token").
 * All callers get typed responses; errors surface as thrown Error with message.
 *
 * 401 handling: redirects to /login so expired tokens never leave the user
 * silently stuck — they always get back to the login screen.
 */

// Strip any accidental trailing slash so paths like /auth/login never become //auth/login
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "");

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // ── 401: token expired or invalid — redirect to login ──────────────────
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      // Clear stale credentials before redirecting
      ["access_token", "branch_id", "branch_name", "auth_type", "token_expiry"].forEach((k) =>
        localStorage.removeItem(k),
      );
      window.location.href = "/login";
    }
    throw new Error("Session expired — please sign in again");
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        // Pydantic validation errors: [{loc, msg, type}, ...]
        message = body.detail
          .map((e: { loc?: string[]; msg?: string }) =>
            e.loc ? `${e.loc.slice(-1)[0]}: ${e.msg}` : e.msg ?? "Validation error"
          )
          .join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {}
    if (process.env.NODE_ENV !== "production") {
      message += ` — ${BASE_URL}${path}`;
    }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: "POST",
      body,
      headers: {},  // let browser set multipart boundary
    }),
};

/**
 * Fetch a PDF/blob from the API and open it in a new browser tab.
 * The user can then print directly from the browser's print dialog.
 * Falls back to a download if the tab is blocked by a popup blocker.
 */
export async function openBlobInTab(
  path: string,
  fallbackFilename: string,
  fetchOptions: RequestInit = {},
): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      ["access_token", "branch_id", "branch_name", "auth_type", "token_expiry"].forEach((k) =>
        localStorage.removeItem(k),
      );
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) throw new Error(`Failed: ${res.status}`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);

  // Try to open in a new tab first — browser can then print from there
  const tab = window.open(url, "_blank", "noopener,noreferrer");

  if (!tab) {
    // Popup blocked — fall back to download
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Revoke after a generous delay to ensure the tab has finished loading
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Download a blob (Excel) as a file attachment */
export async function downloadBlob(path: string, filename: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return;
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
