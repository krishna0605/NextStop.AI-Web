import type {
  MeetingArtifactRecord,
  MeetingFindingsRecord,
  SpeakerSegmentRecord,
  WebMeetingRecord,
} from "@/lib/workspace";

export type CanonicalMeetingArtifact = {
  version: number;
  meetingId: string;
  title: string;
  sourceType: string;
  generatedAt: string;
  sourceModel: string;
  speakerMap: string[];
  speakerSegments: Array<{
    speaker: string;
    startMs: number;
    endMs: number;
    text: string;
    confidence: number | null;
  }>;
  chapters: string[];
  highlights: string[];
  evidenceSnippets: string[];
  summaryShort: string;
  summaryFull: string;
  executiveBullets: string[];
  decisions: string[];
  actionItems: string[];
  risks: string[];
  followUps: string[];
  emailDraft: string;
};

export type StructuredMeetingContent = {
  summaryShort: string;
  summaryFull: string;
  executiveBullets: string[];
  decisions: string[];
  actionItems: string[];
  risks: string[];
  followUps: string[];
  emailDraft: string;
  markdown: string;
  sourceModel: string;
};

function compact(items: Array<string | null | undefined>, fallback: string) {
  const normalized = items.map((item) => item?.trim()).filter(Boolean) as string[];
  return normalized.length > 0 ? normalized : [fallback];
}

function splitEvidenceSnippets(transcriptText: string) {
  return transcriptText
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function buildCanonicalArtifact(args: {
  meeting: WebMeetingRecord;
  findings: MeetingFindingsRecord;
  transcriptText: string;
  speakerSegments: SpeakerSegmentRecord[];
  sourceModel: string;
}) {
  const evidenceSnippets = splitEvidenceSnippets(args.transcriptText);
  const speakerMap = Array.from(
    new Set(
      args.speakerSegments
        .map((segment) => segment.speaker_label.trim())
        .filter(Boolean)
    )
  );
  const chapters = compact(
    [
      args.findings.executive_bullets_json?.[0],
      args.findings.decisions_json?.[0],
      args.findings.action_items_json?.[0],
    ],
    "Meeting findings"
  );

  const artifact: CanonicalMeetingArtifact = {
    version: 1,
    meetingId: args.meeting.id,
    title: args.meeting.title,
    sourceType: args.meeting.source_type,
    generatedAt: new Date().toISOString(),
    sourceModel: args.sourceModel,
    speakerMap,
    speakerSegments: args.speakerSegments.map((segment) => ({
      speaker: segment.speaker_label,
      startMs: segment.start_ms,
      endMs: segment.end_ms,
      text: segment.text_snippet ?? "",
      confidence:
        typeof segment.confidence === "number" ? Number(segment.confidence) : null,
    })),
    chapters,
    highlights: compact(args.findings.executive_bullets_json ?? [], "Meeting captured"),
    evidenceSnippets,
    summaryShort:
      args.findings.summary_short?.trim() || "Meeting findings are available for review.",
    summaryFull:
      args.findings.summary_full?.trim() ||
      args.findings.summary_short?.trim() ||
      "Meeting findings are available for review.",
    executiveBullets: compact(
      args.findings.executive_bullets_json ?? [],
      "No executive bullets captured."
    ),
    decisions: compact(args.findings.decisions_json ?? [], "No decisions captured."),
    actionItems: compact(
      args.findings.action_items_json ?? [],
      "Review the meeting and confirm follow-up tasks."
    ),
    risks: compact(args.findings.risks_json ?? [], "No explicit risks captured."),
    followUps: compact(
      args.findings.follow_ups_json ?? [],
      "Share the findings bundle and confirm next steps."
    ),
    emailDraft:
      args.findings.email_draft?.trim() ||
      `Subject: ${args.meeting.title} recap\n\n${args.findings.summary_short ?? "Sharing the meeting findings."}`,
  };

  return artifact;
}

export function canonicalArtifactToMarkdown(artifact: CanonicalMeetingArtifact) {
  return [
    `# ${artifact.title}`,
    "",
    `Source: ${artifact.sourceType}`,
    `Generated: ${artifact.generatedAt}`,
    `Model: ${artifact.sourceModel}`,
    "",
    "## Summary",
    artifact.summaryFull,
    "",
    "## Executive Bullets",
    ...artifact.executiveBullets.map((item) => `- ${item}`),
    "",
    "## Decisions",
    ...artifact.decisions.map((item) => `- ${item}`),
    "",
    "## Action Items",
    ...artifact.actionItems.map((item) => `- ${item}`),
    "",
    "## Risks",
    ...artifact.risks.map((item) => `- ${item}`),
    "",
    "## Follow Ups",
    ...artifact.followUps.map((item) => `- ${item}`),
    "",
    "## Evidence Snippets",
    ...artifact.evidenceSnippets.map((item) => `- ${item}`),
  ].join("\n");
}

export function parseCanonicalArtifact(
  artifact: MeetingArtifactRecord | null | undefined
): CanonicalMeetingArtifact | null {
  if (!artifact?.payload_json || typeof artifact.payload_json !== "object") {
    return null;
  }

  const payload = artifact.payload_json as Record<string, unknown>;

  if (
    typeof payload.meetingId !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.summaryFull !== "string"
  ) {
    return null;
  }

  return payload as unknown as CanonicalMeetingArtifact;
}

export function deriveStructuredMeetingContent(args: {
  meeting: WebMeetingRecord;
  findings: MeetingFindingsRecord | null;
  artifacts?: MeetingArtifactRecord[] | null;
}) {
  const canonical = parseCanonicalArtifact(
    (args.artifacts ?? []).find((artifact) => artifact.artifact_type === "canonical_json")
  );
  const canonicalMarkdown =
    (args.artifacts ?? []).find((artifact) => artifact.artifact_type === "canonical_markdown")
      ?.payload_text ?? null;

  if (canonical) {
    return {
      summaryShort: canonical.summaryShort,
      summaryFull: canonical.summaryFull,
      executiveBullets: canonical.executiveBullets,
      decisions: canonical.decisions,
      actionItems: canonical.actionItems,
      risks: canonical.risks,
      followUps: canonical.followUps,
      emailDraft: canonical.emailDraft,
      markdown: canonicalMarkdown || canonicalArtifactToMarkdown(canonical),
      sourceModel: canonical.sourceModel,
    } satisfies StructuredMeetingContent;
  }

  return {
    summaryShort:
      args.findings?.summary_short?.trim() ||
      "Finalize a session to generate a structured findings bundle.",
    summaryFull:
      args.findings?.summary_full?.trim() ||
      args.findings?.summary_short?.trim() ||
      "No structured findings have been generated yet.",
    executiveBullets: compact(
      args.findings?.executive_bullets_json ?? [],
      "No executive bullets captured."
    ),
    decisions: compact(args.findings?.decisions_json ?? [], "No decisions captured."),
    actionItems: compact(
      args.findings?.action_items_json ?? [],
      "No action items captured."
    ),
    risks: compact(args.findings?.risks_json ?? [], "No risks captured."),
    followUps: compact(args.findings?.follow_ups_json ?? [], "No follow ups captured."),
    emailDraft:
      args.findings?.email_draft?.trim() ||
      `Subject: ${args.meeting.title} recap\n\n${args.findings?.summary_short ?? "Sharing the meeting findings."}`,
    markdown: [
      `# ${args.meeting.title}`,
      "",
      "## Summary",
      args.findings?.summary_full || args.findings?.summary_short || "No summary generated yet.",
    ].join("\n"),
    sourceModel: args.findings?.source_model || "legacy-findings",
  } satisfies StructuredMeetingContent;
}
