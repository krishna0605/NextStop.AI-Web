type FindingsPayload = {
  summaryShort: string;
  summaryFull: string;
  executiveBullets: string[];
  decisions: string[];
  actionItems: string[];
  risks: string[];
  followUps: string[];
  emailDraft: string;
  sourceModel: string;
};

function splitSentences(text: string) {
  return text
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function trimList(items: string[], fallback: string) {
  const normalized = items
    .map((item) => item.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized.slice(0, 4) : [fallback];
}

export function fallbackFindings(title: string, sourceText: string): FindingsPayload {
  const sentences = splitSentences(sourceText);
  const summarySource = sentences.slice(0, 3).join(" ");
  const actionCandidates = sentences.filter((sentence) =>
    /will|should|need to|follow up|action|owner|next/i.test(sentence)
  );
  const decisionCandidates = sentences.filter((sentence) =>
    /decided|decision|agreed|approved/i.test(sentence)
  );
  const riskCandidates = sentences.filter((sentence) =>
    /risk|blocker|issue|concern|stuck/i.test(sentence)
  );
  const followUpCandidates = sentences.filter((sentence) =>
    /next|follow up|schedule|send|review/i.test(sentence)
  );

  const summaryShort =
    summarySource ||
    `NextStop captured the main discussion for ${title} and generated a privacy-first review bundle.`;

  const summaryFull =
    sentences.length > 0
      ? sentences.slice(0, 6).join(" ")
      : "This meeting was finalized without a durable transcript. The saved record keeps only the summary, decisions, and follow-up items.";

  const executiveBullets = trimList(
    sentences.slice(0, 4),
    "Meeting completed and findings were generated from the available session context."
  );
  const decisions = trimList(
    decisionCandidates,
    "No explicit decisions were detected in the available session text."
  );
  const actionItems = trimList(
    actionCandidates,
    "Review the meeting summary and confirm any follow-up tasks manually."
  );
  const risks = trimList(
    riskCandidates,
    "No major blockers or risks were detected in the available session text."
  );
  const followUps = trimList(
    followUpCandidates,
    "Share the summary, confirm next steps, and export the meeting findings if needed."
  );

  const emailDraft = [
    `Subject: ${title} recap`,
    "",
    "Hi team,",
    "",
    summaryShort,
    "",
    "Key takeaways:",
    ...executiveBullets.map((item) => `- ${item}`),
    "",
    "Next steps:",
    ...actionItems.map((item) => `- ${item}`),
  ].join("\n");

  return {
    summaryShort,
    summaryFull,
    executiveBullets,
    decisions,
    actionItems,
    risks,
    followUps,
    emailDraft,
    sourceModel: "fallback-local-summary",
  };
}

async function openAiFindings(title: string, sourceText: string): Promise<FindingsPayload> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackFindings(title, sourceText);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the hidden NextStop.ai findings engine. Return strict JSON with keys summaryShort, summaryFull, executiveBullets, decisions, actionItems, risks, followUps, emailDraft. Keep each list concise, high-signal, and privacy-safe.",
        },
        {
          role: "user",
          content: `Meeting title: ${title}\n\nSession text:\n${sourceText}`,
        },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "OpenAI findings generation failed.");
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI findings response did not contain JSON content.");
  }

  const parsed = JSON.parse(content) as Partial<FindingsPayload>;
  const fallback = fallbackFindings(title, sourceText);

  return {
    summaryShort: typeof parsed.summaryShort === "string" ? parsed.summaryShort : fallback.summaryShort,
    summaryFull: typeof parsed.summaryFull === "string" ? parsed.summaryFull : fallback.summaryFull,
    executiveBullets: Array.isArray(parsed.executiveBullets)
      ? trimList(parsed.executiveBullets.filter((item): item is string => typeof item === "string"), "No executive bullets returned.")
      : fallback.executiveBullets,
    decisions: Array.isArray(parsed.decisions)
      ? trimList(parsed.decisions.filter((item): item is string => typeof item === "string"), "No explicit decisions were detected.")
      : fallback.decisions,
    actionItems: Array.isArray(parsed.actionItems)
      ? trimList(parsed.actionItems.filter((item): item is string => typeof item === "string"), "No clear action items were returned.")
      : fallback.actionItems,
    risks: Array.isArray(parsed.risks)
      ? trimList(parsed.risks.filter((item): item is string => typeof item === "string"), "No clear risks were returned.")
      : fallback.risks,
    followUps: Array.isArray(parsed.followUps)
      ? trimList(parsed.followUps.filter((item): item is string => typeof item === "string"), "No follow-ups were returned.")
      : fallback.followUps,
    emailDraft: typeof parsed.emailDraft === "string" ? parsed.emailDraft : fallback.emailDraft,
    sourceModel: "gpt-4o-mini",
  };
}

export async function generateMeetingFindings(title: string, sourceText: string) {
  const normalizedText = sourceText.trim();

  if (!normalizedText) {
    return fallbackFindings(title, normalizedText);
  }

  try {
    return await openAiFindings(title, normalizedText);
  } catch (error) {
    console.warn("[ai-core] Falling back from OpenAI findings generation", error);
    return fallbackFindings(title, normalizedText);
  }
}
