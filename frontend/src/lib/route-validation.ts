import { SELF_SERVE_PLAN_CODE, type PlanCode } from "@/lib/billing";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function parseRequiredUuid(value: unknown, fieldName = "id") {
  if (!isUuid(value)) {
    return { ok: false as const, error: `${fieldName} must be a valid UUID.` };
  }

  return { ok: true as const, value };
}

export function isSafeAppPath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return false;
  }

  if (/[\r\n]/.test(trimmed)) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    return decoded.startsWith("/") && !decoded.startsWith("//") && !/[\r\n]/.test(decoded);
  } catch {
    return false;
  }
}

export function parseSafeNextPath(value: unknown, fallback = "/dashboard") {
  return isSafeAppPath(value) ? value.trim() : fallback;
}

export function parsePlanCode(value: unknown) {
  if (value === SELF_SERVE_PLAN_CODE || value === "pro_trial" || value === "none") {
    return { ok: true as const, value: value as PlanCode };
  }

  return { ok: false as const, error: "Unsupported plan selection." };
}

export function parsePositiveInteger(value: unknown, fieldName: string, max = 100) {
  const numberValue = typeof value === "string" ? Number(value) : value;

  if (
    typeof numberValue !== "number" ||
    !Number.isInteger(numberValue) ||
    numberValue < 1 ||
    numberValue > max
  ) {
    return { ok: false as const, error: `${fieldName} must be an integer from 1 to ${max}.` };
  }

  return { ok: true as const, value: numberValue };
}
