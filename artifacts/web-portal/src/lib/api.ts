const BASE = "/api/admin";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = "/";
    throw new Error("Oturum süresi doldu");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "İstek başarısız");
  return data as T;
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body: unknown) => req<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => req<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => req<T>(path, { method: "DELETE" }),
};
