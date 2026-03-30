"use client";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getPublicBackendUrl() {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return configured ? trimTrailingSlash(configured) : null;
}

function isFrontendApiPath(path: string) {
  return path === "/api" || path.startsWith("/api/");
}

export function resolveFrontendApiUrl(path: string) {
  const normalizedPath = normalizePath(path);

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(normalizedPath, window.location.origin).toString();
  }

  return normalizedPath;
}

export function resolveBackendApiUrl(path: string) {
  const normalizedPath = normalizePath(path);
  const backendUrl = getPublicBackendUrl();

  if (!backendUrl) {
    return normalizedPath;
  }

  return `${backendUrl}${normalizedPath}`;
}

export function resolvePublicApiUrl(path: string) {
  const normalizedPath = normalizePath(path);

  if (isFrontendApiPath(normalizedPath)) {
    return resolveFrontendApiUrl(normalizedPath);
  }

  return resolveBackendApiUrl(normalizedPath);
}
