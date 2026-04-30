const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|token|secret|signature|transcript|audio|meeting_content|provider_token|refresh_token|access_token)/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[Filtered]" : redactValue(item),
    ])
  );
}

export function scrubSentryEvent<T extends { request?: unknown; extra?: unknown; contexts?: unknown }>(
  event: T
): T {
  return redactValue(event) as T;
}
