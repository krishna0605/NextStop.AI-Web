import { NextResponse } from "next/server";

function sanitizeFilenamePart(value: string, fallback = "download") {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

export function buildDownloadFilename(
  title: string,
  suffix: string,
  extension: string
) {
  return `${sanitizeFilenamePart(title)}-${sanitizeFilenamePart(
    suffix,
    "file"
  )}.${sanitizeFilenamePart(extension, "txt")}`;
}

export function internalServerErrorResponse(
  publicMessage: string,
  error: unknown,
  context: string
) {
  if (error instanceof Error) {
    console.error(context, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(context, error);
  }

  return NextResponse.json(
    {
      error: publicMessage,
    },
    { status: 500 }
  );
}
