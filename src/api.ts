import { useCallback, useEffect, useRef, useState } from "react";
import { appPath, staticPreview } from "./paths";
const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
export function mediaUrl(url: string) {
  if (/^\/(assets\/|licenses\/|ASSET-CREDITS\.md)/.test(url)) return appPath(url);
  return url.startsWith("/api/") ? base + url : url;
}
let catalog: Promise<import("./preview-catalog").PreviewCatalog> | undefined;
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (staticPreview) {
    if ((options.method || "GET").toUpperCase() !== "GET")
      throw new ApiError("Accounts, uploads and ordering are not enabled on this preview.", 503);
    if (path === "/session") return { user: null } as T;
    catalog ??= fetch(appPath("preview/catalog.json"))
      .then((response) => {
        if (!response.ok) throw new Error("The food catalogue could not be loaded. Reload the page.");
        return response.json();
      }).catch((error) => { catalog = undefined; throw error; });
    const { queryPreview } = await import("./preview-catalog");
    try {
      return queryPreview(await catalog, path) as T;
    } catch (error) {
      throw new ApiError((error as Error).message, (error as { status?: number }).status || 503);
    }
  }
  const response = await fetch(base + "/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "The server could not be reached. Try again." }));
  if (!response.ok)
    throw new ApiError(
      data.error || "Something went wrong.",
      response.status,
      data.code,
    );
  return data as T;
}
export const send = <T>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(body) });
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const latest = useRef(0);
  useEffect(() => {
    const request = ++latest.current;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    api<T>(path)
      .then((v) => {
        if (latest.current === request) setData(v);
      })
      .catch((e) => {
        if (latest.current === request) setError(e.message);
      })
      .finally(() => {
        if (latest.current === request) setLoading(false);
      });
    return () => {
      latest.current++;
    };
  }, [path, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  return { data, setData, error, loading, reload };
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
export const initials = (value = "Makanlah") =>
  value
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
