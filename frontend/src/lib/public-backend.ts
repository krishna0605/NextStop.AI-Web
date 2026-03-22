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

export function resolvePublicApiUrl(path: string) {
  const normalizedPath = normalizePath(path);
  const backendUrl = getPublicBackendUrl();

  if (!backendUrl) {
    return normalizedPath;
  }

  return `${backendUrl}${normalizedPath}`;
}
