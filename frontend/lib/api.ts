/**
 * Thin fetch wrapper. Reads token from localStorage (key: "access_token").
 * All callers get typed responses; errors surface as thrown Error with message.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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

/** Download a blob (Excel, PDF) */
export async function downloadBlob(path: string, filename: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
