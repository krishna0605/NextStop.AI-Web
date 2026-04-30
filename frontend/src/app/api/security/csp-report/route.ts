import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CSP_REPORT_BYTES = 64_000;

function scrubReport(value: unknown) {
  const report =
    value && typeof value === "object"
      ? ((value as Record<string, unknown>)["csp-report"] ?? value)
      : null;

  if (!report || typeof report !== "object") {
    return { malformed: true };
  }

  const record = report as Record<string, unknown>;

  return {
    documentUri:
      typeof record["document-uri"] === "string"
        ? stripQueryAndFragment(record["document-uri"])
        : null,
    blockedUri:
      typeof record["blocked-uri"] === "string"
        ? stripQueryAndFragment(record["blocked-uri"])
        : null,
    violatedDirective:
      typeof record["violated-directive"] === "string"
        ? record["violated-directive"].slice(0, 160)
        : null,
    effectiveDirective:
      typeof record["effective-directive"] === "string"
        ? record["effective-directive"].slice(0, 160)
        : null,
    disposition:
      typeof record.disposition === "string" ? record.disposition.slice(0, 40) : null,
    statusCode: typeof record["status-code"] === "number" ? record["status-code"] : null,
  };
}

function stripQueryAndFragment(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return value.split(/[?#]/)[0]?.slice(0, 500) ?? null;
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > MAX_CSP_REPORT_BYTES) {
    return NextResponse.json({ error: "CSP report too large." }, { status: 413 });
  }

  const rawBody = await request.text();

  if (rawBody.length > MAX_CSP_REPORT_BYTES) {
    return NextResponse.json({ error: "CSP report too large." }, { status: 413 });
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const report = scrubReport(payload);
    console.warn("[security] CSP report-only violation", report);
    Sentry.captureMessage("CSP report-only violation", {
      level: "warning",
      extra: {
        cspReport: report,
      },
    });
  } catch {
    console.warn("[security] Malformed CSP report-only violation");
    Sentry.captureMessage("Malformed CSP report-only violation", {
      level: "warning",
    });
  }

  return new Response(null, { status: 204 });
}
