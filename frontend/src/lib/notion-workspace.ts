import "server-only";

import crypto from "node:crypto";

import { getMeetingStructuredContent } from "@/lib/ai-pipeline";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  getAppUrl,
  getNotionRedirectUri as getConfiguredNotionRedirectUri,
  getNotionOAuthConfigured,
} from "@/lib/env";
import type { IntegrationRecord, NotionDestination, NotionDestinationType } from "@/lib/workspace";

const NOTION_VERSION = "2022-06-28";

type NotionOwner = {
  type?: string | null;
};

type NotionTokenPayload = {
  access_token: string;
  refresh_token?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  bot_id?: string | null;
  owner?: NotionOwner | null;
};

type NotionSearchResult = {
  object: "page" | "database";
  id: string;
  url?: string | null;
  title?: Array<{ plain_text?: string | null }> | null;
  properties?: Record<
    string,
    {
      type?: string;
      title?: Array<{ plain_text?: string | null }> | null;
    }
  > | null;
};

type NotionApiErrorPayload = {
  message?: string;
};

type MeetingRow = {
  id: string;
  title: string;
  source_type: string;
  created_at?: string | null;
};

type FindingsRow = {
  id: string;
  summary_short?: string | null;
  summary_full?: string | null;
  executive_bullets_json?: string[] | null;
  decisions_json?: string[] | null;
  action_items_json?: string[] | null;
  risks_json?: string[] | null;
  follow_ups_json?: string[] | null;
  email_draft?: string | null;
  source_model?: string | null;
};

export class NotionIntegrationError extends Error {
  status: number;
  code: "not_connected" | "reauth_required" | "request_failed";

  constructor(
    message: string,
    status: number,
    code: "not_connected" | "reauth_required" | "request_failed"
  ) {
    super(message);
    this.name = "NotionIntegrationError";
    this.status = status;
    this.code = code;
  }
}

export function isNotionBrokerConfigured() {
  return getNotionOAuthConfigured();
}

function getStateSecret() {
  return (
    process.env.NOTION_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getNotionAppUrl(fallbackOrigin?: string) {
  return getAppUrl(fallbackOrigin);
}

export function getNotionRedirectUri(fallbackOrigin?: string) {
  return getConfiguredNotionRedirectUri(fallbackOrigin);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  const secret = getStateSecret();

  if (!secret) {
    throw new Error(
      "Notion OAuth state signing is not configured. Add NOTION_OAUTH_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function buildNotionAuthorizeUrl(userId: string, fallbackOrigin?: string) {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();

  if (!clientId || !process.env.NOTION_CLIENT_SECRET?.trim()) {
    throw new Error(
      "Notion OAuth is not configured locally. Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to .env.local."
    );
  }

  const redirectUri = getNotionRedirectUri(fallbackOrigin);
  const statePayload = {
    userId,
    issuedAt: Date.now(),
    redirectUri,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(statePayload));
  const state = `${encodedPayload}.${signPayload(encodedPayload)}`;
  const authorizeUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("owner", "user");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  return authorizeUrl.toString();
}

export function verifyNotionState<T extends { issuedAt?: number }>(
  state: string,
  maxAgeMs = 15 * 60 * 1000
) {
  const [payloadPart, signaturePart] = state.split(".");

  if (!payloadPart || !signaturePart) {
    throw new Error("Invalid Notion integration state.");
  }

  const expected = signPayload(payloadPart);
  const valid =
    signaturePart.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signaturePart), Buffer.from(expected));

  if (!valid) {
    throw new Error("Invalid Notion integration state.");
  }

  const payload = JSON.parse(decodeBase64Url(payloadPart)) as T;

  if (!payload.issuedAt || Date.now() - payload.issuedAt > maxAgeMs) {
    throw new Error("Notion integration state expired.");
  }

  return payload;
}

export async function exchangeNotionAuthorizationCode(code: string, redirectUri: string) {
  const clientId = getRequiredEnv("NOTION_CLIENT_ID");
  const clientSecret = getRequiredEnv("NOTION_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | (NotionTokenPayload & NotionApiErrorPayload)
    | NotionApiErrorPayload
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    throw new Error(payload?.message || "Unable to exchange the Notion authorization code.");
  }

  return payload;
}

export async function notionApiFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | NotionApiErrorPayload | null;
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message
      : null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new NotionIntegrationError(
        "Notion session expired. Reconnect Notion to continue.",
        409,
        "reauth_required"
      );
    }

    throw new NotionIntegrationError(message || "Notion API request failed.", response.status || 500, "request_failed");
  }

  return payload as T;
}

export async function getNotionIntegration(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integrations_notion")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as IntegrationRecord | null) ?? null;
}

function getNotionAccessToken(integration: IntegrationRecord | null) {
  if (
    integration?.status === "reconnect_required" ||
    integration?.status === "error"
  ) {
    throw new NotionIntegrationError(
      "Notion session expired. Reconnect Notion to continue.",
      409,
      "reauth_required"
    );
  }

  const metadata = integration?.metadata;
  const token =
    metadata &&
    typeof metadata === "object" &&
    typeof metadata.provider_access_token === "string"
      ? metadata.provider_access_token
      : null;

  if (!integration || !token) {
    throw new NotionIntegrationError("Reconnect Notion to continue.", 409, "not_connected");
  }

  return token;
}

async function updateNotionIntegration(userId: string, updates: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.from("integrations_notion").update(updates).eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function markNotionReconnectRequired(
  userId: string,
  integration: IntegrationRecord,
  reason: string
) {
  await updateNotionIntegration(userId, {
    status: "reconnect_required",
    metadata: {
      ...(integration.metadata ?? {}),
      reauth_required: true,
      last_error: reason,
    },
  });
}

async function withNotionIntegration<T>(
  userId: string,
  action: (args: { integration: IntegrationRecord; accessToken: string }) => Promise<T>
) {
  const integration = await getNotionIntegration(userId);

  if (!integration || integration.status === "disconnected") {
    throw new NotionIntegrationError("Connect Notion first.", 409, "not_connected");
  }

  if (integration.status === "reconnect_required" || integration.status === "error") {
    throw new NotionIntegrationError(
      "Notion session expired. Reconnect Notion to continue.",
      409,
      "reauth_required"
    );
  }

  try {
    return await action({
      integration,
      accessToken: getNotionAccessToken(integration),
    });
  } catch (error) {
    if (error instanceof NotionIntegrationError && error.code === "reauth_required") {
      await markNotionReconnectRequired(userId, integration, error.message);
    }

    throw error;
  }
}

function richTextToPlainText(value?: Array<{ plain_text?: string | null }> | null) {
  return (value ?? [])
    .map((item) => item.plain_text ?? "")
    .join("")
    .trim();
}

function extractPageTitle(
  properties?: Record<
    string,
    {
      type?: string;
      title?: Array<{ plain_text?: string | null }> | null;
    }
  > | null
) {
  if (!properties) {
    return "";
  }

  for (const value of Object.values(properties)) {
    if (value?.type === "title") {
      return richTextToPlainText(value.title);
    }
  }

  return "";
}

function toNotionDestination(result: NotionSearchResult): NotionDestination {
  const title =
    result.object === "database"
      ? richTextToPlainText(result.title)
      : extractPageTitle(result.properties);

  return {
    id: result.id,
    name:
      title ||
      `${result.object === "database" ? "Database" : "Page"} ${result.id.slice(0, 8)}`,
    type: result.object,
    url: result.url ?? null,
  };
}

export async function upsertNotionConnection(args: {
  userId: string;
  token: NotionTokenPayload;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("integrations_notion").upsert({
    user_id: args.userId,
    status: "needs_destination",
    external_workspace_name: args.token.workspace_name ?? "Connected workspace",
    selected_destination_id: null,
    selected_destination_name: null,
    metadata: {
      provider: "notion",
      provider_access_token: args.token.access_token,
      provider_refresh_token: args.token.refresh_token ?? null,
      workspace_id: args.token.workspace_id ?? null,
      bot_id: args.token.bot_id ?? null,
      owner_type: args.token.owner?.type ?? null,
      connected_via: "next_api",
      destination_type: null,
    },
    connected_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function loadNotionDestinations(userId: string) {
  return withNotionIntegration(userId, async ({ accessToken }) => {
    const results = await notionApiFetch<{ results?: NotionSearchResult[] }>(accessToken, "/search", {
      method: "POST",
      body: JSON.stringify({
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        page_size: 50,
      }),
    });

    return (results.results ?? [])
      .filter((item) => item.object === "page" || item.object === "database")
      .map(toNotionDestination);
  });
}

export async function saveNotionDestination(args: {
  userId: string;
  destinationId: string;
  destinationName: string;
  destinationType: NotionDestinationType;
}) {
  const integration = await getNotionIntegration(args.userId);

  if (!integration) {
    throw new Error("Connect Notion first.");
  }

  if (integration.status === "reconnect_required" || integration.status === "error") {
    throw new NotionIntegrationError(
      "Reconnect Notion before saving a destination.",
      409,
      "reauth_required"
    );
  }

  const admin = createAdminClient();
  const metadata = {
    ...(integration.metadata ?? {}),
    destination_type: args.destinationType,
    connected_via: "next_api",
  };

  const { error } = await admin
    .from("integrations_notion")
    .update({
      status: "connected",
      selected_destination_id: args.destinationId,
      selected_destination_name: args.destinationName,
      metadata,
    })
    .eq("user_id", args.userId);

  if (error) {
    throw error;
  }
}

function paragraphBlock(text: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: text.slice(0, 2000),
          },
        },
      ],
    },
  };
}

function headingBlock(text: string) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [
        {
          type: "text",
          text: {
            content: text.slice(0, 2000),
          },
        },
      ],
    },
  };
}

function bulletsToBlocks(items: string[] | null | undefined) {
  return (items ?? []).slice(0, 20).map((item) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [
        {
          type: "text",
          text: {
            content: item.slice(0, 2000),
          },
        },
      ],
    },
  }));
}

function buildFindingsBlocks(
  meeting: MeetingRow,
  findings: FindingsRow,
  artifacts: import("./workspace").MeetingArtifactRecord[]
) {
  const structured = getMeetingStructuredContent({
    meeting: {
      id: meeting.id,
      user_id: "",
      title: meeting.title,
      source_type: meeting.source_type as import("./workspace").MeetingSourceType,
      status: "ready",
      created_at: meeting.created_at ?? null,
    },
    findings: {
      id: findings.id,
      meeting_id: meeting.id,
      user_id: "",
      status: "ready",
      summary_short: findings.summary_short,
      summary_full: findings.summary_full,
      executive_bullets_json: findings.executive_bullets_json,
      decisions_json: findings.decisions_json,
      action_items_json: findings.action_items_json,
      risks_json: findings.risks_json,
      follow_ups_json: findings.follow_ups_json,
      email_draft: findings.email_draft,
      source_model: findings.source_model,
    },
    artifacts,
  });

  return [
    headingBlock("Summary"),
    paragraphBlock(structured.summaryFull || structured.summaryShort || "No summary generated yet."),
    headingBlock("Executive Bullets"),
    ...bulletsToBlocks(structured.executiveBullets),
    headingBlock("Decisions"),
    ...bulletsToBlocks(structured.decisions),
    headingBlock("Action Items"),
    ...bulletsToBlocks(structured.actionItems),
    headingBlock("Risks"),
    ...bulletsToBlocks(structured.risks),
    headingBlock("Follow Ups"),
    ...bulletsToBlocks(structured.followUps),
    paragraphBlock(`Source: ${meeting.source_type} | Created: ${meeting.created_at ?? "Not set"}`),
  ];
}

async function createNotionExportPage(args: {
  meeting: MeetingRow;
  findings: FindingsRow;
  artifacts: import("./workspace").MeetingArtifactRecord[];
  integration: IntegrationRecord;
}) {
  const destinationType =
    args.integration.metadata &&
    typeof args.integration.metadata === "object" &&
    args.integration.metadata.destination_type === "database"
      ? "database"
      : "page";
  const destinationId = args.integration.selected_destination_id;
  const accessToken = getNotionAccessToken(args.integration);

  if (!destinationId) {
    throw new Error("Choose a Notion destination before exporting.");
  }

  const children = buildFindingsBlocks(args.meeting, args.findings, args.artifacts);

  if (destinationType === "database") {
    const database = await notionApiFetch<{
      properties?: Record<string, { type?: string }>;
    }>(accessToken, `/databases/${destinationId}`, { method: "GET" });

    const titleProperty = Object.entries(database.properties ?? {}).find(
      ([, value]) => value?.type === "title"
    )?.[0];

    if (!titleProperty) {
      throw new Error("The selected Notion database does not have a title property.");
    }

    return notionApiFetch<{ id: string; url?: string | null }>(accessToken, "/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: destinationId },
        properties: {
          [titleProperty]: {
            title: [
              {
                type: "text",
                text: {
                  content: args.meeting.title.slice(0, 2000),
                },
              },
            ],
          },
        },
        children,
      }),
    });
  }

  return notionApiFetch<{ id: string; url?: string | null }>(accessToken, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { page_id: destinationId },
      children: [
        {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: args.meeting.title.slice(0, 2000),
                },
              },
            ],
          },
        },
        ...children,
      ],
    }),
  });
}

export async function exportMeetingToNotion(userId: string, meetingId: string) {
  const admin = createAdminClient();
  const [integration, meetingResult, findingsResult, artifactsResult] = await Promise.all([
    getNotionIntegration(userId),
    admin
      .from("web_meetings")
      .select("id,title,source_type,created_at")
      .eq("id", meetingId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("meeting_findings")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("meeting_artifacts")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId),
  ]);

  if (!integration || integration.status !== "connected") {
    throw new NotionIntegrationError(
      "Connect Notion and choose a destination before exporting there.",
      409,
      "not_connected"
    );
  }

  if (meetingResult.error) {
    throw meetingResult.error;
  }

  if (findingsResult.error) {
    throw findingsResult.error;
  }

  if (!meetingResult.data) {
    throw new Error("Meeting not found.");
  }

  if (!findingsResult.data) {
    throw new Error("This meeting does not have findings ready for export yet.");
  }

  const exportInsert = await admin
    .from("meeting_exports")
    .insert({
      meeting_id: meetingId,
      user_id: userId,
      export_type: "notion",
      status: "processing",
      destination: integration.selected_destination_name ?? "configured destination",
    })
    .select("id")
    .single();

  if (exportInsert.error) {
    throw exportInsert.error;
  }

  const exportId = exportInsert.data.id as string;

  try {
    const createdPage = await createNotionExportPage({
      meeting: meetingResult.data as MeetingRow,
      findings: findingsResult.data as FindingsRow,
      artifacts: (artifactsResult.data as import("./workspace").MeetingArtifactRecord[] | null) ?? [],
      integration,
    });

    const { error: updateError } = await admin
      .from("meeting_exports")
      .update({
        status: "completed",
        metadata: {
          notion_page_id: createdPage.id,
          notion_page_url: createdPage.url ?? null,
          destination_type:
            integration.metadata &&
            typeof integration.metadata === "object" &&
            typeof integration.metadata.destination_type === "string"
              ? integration.metadata.destination_type
              : null,
          exported_via: "next_api",
        },
      })
      .eq("id", exportId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    return {
      pageId: createdPage.id,
      pageUrl: createdPage.url ?? null,
    };
  } catch (error) {
    if (error instanceof NotionIntegrationError && error.code === "reauth_required") {
      await markNotionReconnectRequired(userId, integration, error.message);
    }

    const message =
      error instanceof Error ? error.message : "Unable to export the findings to Notion.";

    await admin
      .from("meeting_exports")
      .update({
        status: "failed",
        metadata: {
          error: message,
          exported_via: "next_api",
        },
      })
      .eq("id", exportId)
      .eq("user_id", userId);

    throw error;
  }
}
