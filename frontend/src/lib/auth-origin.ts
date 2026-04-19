const LOCAL_AUTH_HOST_ALIASES = new Set(["0.0.0.0", "[::]"]);

function normalizeLocalHostname(hostname: string) {
  return LOCAL_AUTH_HOST_ALIASES.has(hostname) ? "localhost" : hostname;
}

export function normalizeAuthOrigin(origin: string) {
  try {
    const url = new URL(origin);
    url.hostname = normalizeLocalHostname(url.hostname);
    return url.origin;
  } catch {
    return origin;
  }
}

export function getBrowserAuthOrigin() {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  return normalizeAuthOrigin(window.location.origin);
}
