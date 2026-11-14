const TOKEN_STORAGE_KEY = "toolbox_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getBackendBaseUrlForBrowser(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:8000";
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  const { protocol, hostname, port, origin } = window.location;
  // Support GitHub Codespaces forwarded URLs like <name>-3000.app.github.dev -> <name>-8000.app.github.dev
  if (hostname.includes("-3000.")) {
    return `${protocol}//${hostname.replace("-3000.", "-8000.")}`;
  }
  // When accessing Next.js directly on port 3000 (local/VM), connect WS to FastAPI on port 8000
  if (port === "3000") {
    return `${protocol}//${hostname}:8000`;
  }
  // Behind unified reverse proxy or Cloudflare Tunnel (same origin handles /api and /ws)
  return origin;
}

export function getWebSocketUrl(slug: string, clientId: string, token: string | null, displayName?: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL
    ? process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "")
    : getBackendBaseUrlForBrowser().replace(/^http/, "ws");

  const params = new URLSearchParams({ client_id: clientId });
  if (token) params.set("token", token);
  if (displayName) params.set("name", displayName);
  return `${base}/ws/tools/live-text/${encodeURIComponent(slug)}?${params.toString()}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string | null
): Promise<T> {
  const token = tokenOverride !== undefined ? tokenOverride : getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      }
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}
