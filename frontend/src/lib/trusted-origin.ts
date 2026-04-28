const TRUSTED_ORIGIN_ENV_KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "PRODUCTION_BASE_URL",
];

const TRUSTED_ORIGINS_LIST_ENV_KEYS = [
  "TRUSTED_APP_ORIGINS",
  "CSRF_TRUSTED_ORIGINS",
];

const VERCEL_HOST_ENV_KEYS = ["VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"];

export interface TrustedMutationOriginResult {
  trusted: boolean;
  reason:
    | "same-origin"
    | "trusted-origin"
    | "missing-origin"
    | "invalid-origin"
    | "untrusted-origin";
  receivedOrigin: string | null;
  trustedOrigins: string[];
}

function normalizeOrigin(value: string | undefined | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function normalizeHostAsHttpsOrigin(value: string | undefined | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return normalizeOrigin(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
}

function getHeaderOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return null;
  }

  return normalizeOrigin(referer);
}

export function getTrustedMutationOrigins(requestUrl: string) {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(requestUrl);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  for (const key of TRUSTED_ORIGIN_ENV_KEYS) {
    const origin = normalizeOrigin(process.env[key]);

    if (origin) {
      origins.add(origin);
    }
  }

  for (const key of VERCEL_HOST_ENV_KEYS) {
    const origin = normalizeHostAsHttpsOrigin(process.env[key]);

    if (origin) {
      origins.add(origin);
    }
  }

  for (const key of TRUSTED_ORIGINS_LIST_ENV_KEYS) {
    const value = process.env[key];

    if (!value) {
      continue;
    }

    for (const candidate of value.split(",")) {
      const origin = normalizeOrigin(candidate);

      if (origin) {
        origins.add(origin);
      }
    }
  }

  return [...origins].sort();
}

export function validateTrustedMutationOrigin(
  request: Request
): TrustedMutationOriginResult {
  const trustedOrigins = getTrustedMutationOrigins(request.url);
  const receivedOrigin = getHeaderOrigin(request);

  if (!request.headers.get("origin") && !request.headers.get("referer")) {
    return {
      trusted: true,
      reason: "missing-origin",
      receivedOrigin: null,
      trustedOrigins,
    };
  }

  if (!receivedOrigin) {
    return {
      trusted: false,
      reason: "invalid-origin",
      receivedOrigin: null,
      trustedOrigins,
    };
  }

  if (trustedOrigins.includes(receivedOrigin)) {
    const requestOrigin = normalizeOrigin(request.url);

    return {
      trusted: true,
      reason: receivedOrigin === requestOrigin ? "same-origin" : "trusted-origin",
      receivedOrigin,
      trustedOrigins,
    };
  }

  return {
    trusted: false,
    reason: "untrusted-origin",
    receivedOrigin,
    trustedOrigins,
  };
}
