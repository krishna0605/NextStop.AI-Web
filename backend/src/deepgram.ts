const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&paragraphs=true&utterances=true";
const DEFAULT_MAX_ATTEMPTS = 3;

type DeepgramResponse = {
  metadata?: {
    request_id?: string;
    model_info?: Record<
      string,
      {
        name?: string;
        version?: string;
      }
    >;
  };
  results?: {
    channels?: Array<{
      detected_language?: string;
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        languages?: string[];
        paragraphs?: {
          transcript?: string;
          paragraphs?: Array<{
            start?: number;
            end?: number;
            sentences?: Array<{
              text?: string;
              start?: number;
              end?: number;
            }>;
            speaker?: number;
          }>;
        };
        utterances?: Array<{
          start?: number;
          end?: number;
          transcript?: string;
          confidence?: number;
          speaker?: number;
        }>;
      }>;
    }>;
  };
  err_msg?: string;
};

export type DeepgramParagraph = {
  index: number;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
  speakerLabel: string | null;
};

export type DeepgramTranscriptionResult = {
  transcript: string;
  provider: "deepgram";
  sourceModel: string;
  requestId: string | null;
  language: string | null;
  confidence: number | null;
  durationSeconds: number | null;
  paragraphs: DeepgramParagraph[];
  providerMetadata: Record<string, unknown>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "TypeError" ||
    /fetch failed|network|timeout/i.test(error.message)
  );
}

function resolveSourceModel(payload: DeepgramResponse) {
  const modelInfo = payload.metadata?.model_info;

  if (!modelInfo) {
    return "deepgram:nova-2";
  }

  const firstModel = Object.values(modelInfo)[0];
  const name = firstModel?.name?.trim();
  const version = firstModel?.version?.trim();

  if (name && version) {
    return `deepgram:${name}@${version}`;
  }

  if (name) {
    return `deepgram:${name}`;
  }

  return "deepgram:nova-2";
}

function toMilliseconds(seconds: number | undefined) {
  if (!Number.isFinite(seconds)) {
    return 0;
  }

  return Math.max(0, Math.round((seconds ?? 0) * 1000));
}

function extractParagraphs(payload: DeepgramResponse) {
  const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
  const utterances = alternative?.utterances ?? [];
  const paragraphCandidates = alternative?.paragraphs?.paragraphs ?? [];

  if (utterances.length > 0) {
    return utterances
      .map<DeepgramParagraph | null>((utterance, index) => {
        const text = utterance.transcript?.trim();

        if (!text) {
          return null;
        }

        const speaker =
          typeof utterance.speaker === "number" ? `Speaker ${utterance.speaker + 1}` : null;

        return {
          index,
          text,
          startMs: toMilliseconds(utterance.start),
          endMs: toMilliseconds(utterance.end),
          confidence:
            typeof utterance.confidence === "number" ? Number(utterance.confidence.toFixed(3)) : null,
          speakerLabel: speaker,
        };
      })
      .filter((paragraph): paragraph is DeepgramParagraph => Boolean(paragraph));
  }

  return paragraphCandidates
    .map<DeepgramParagraph | null>((paragraph, index) => {
      const sentences = paragraph.sentences ?? [];
      const sentenceText = sentences
        .map((sentence) => sentence.text?.trim())
        .filter((sentence): sentence is string => Boolean(sentence))
        .join(" ")
        .trim();
      const text = sentenceText || alternative?.paragraphs?.transcript?.trim() || "";

      if (!text) {
        return null;
      }

      const speaker =
        typeof paragraph.speaker === "number" ? `Speaker ${paragraph.speaker + 1}` : null;
      const firstSentence = sentences[0];
      const lastSentence = sentences[sentences.length - 1] ?? firstSentence;

      return {
        index,
        text,
        startMs: toMilliseconds(firstSentence?.start),
        endMs: toMilliseconds(lastSentence?.end),
        confidence:
          typeof alternative?.confidence === "number"
            ? Number(alternative.confidence.toFixed(3))
            : null,
        speakerLabel: speaker,
      };
    })
    .filter((paragraph): paragraph is DeepgramParagraph => Boolean(paragraph));
}

function normalizeDeepgramPayload(payload: DeepgramResponse): DeepgramTranscriptionResult {
  const channel = payload.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const transcript = alternative?.transcript?.trim() || "";

  if (!transcript) {
    throw new Error(
      'Deepgram returned an empty transcript. No speech was detected in the recorded audio. Make sure the meeting tab is shared with "Share tab audio" enabled and that someone speaks before ending the capture.'
    );
  }

  const paragraphs = extractParagraphs(payload);
  const durationSeconds =
    paragraphs.length > 0 ? Math.max(...paragraphs.map((paragraph) => paragraph.endMs)) / 1000 : null;

  return {
    transcript,
    provider: "deepgram",
    sourceModel: resolveSourceModel(payload),
    requestId: payload.metadata?.request_id ?? null,
    language: alternative?.languages?.[0]?.trim() || channel?.detected_language?.trim() || null,
    confidence:
      typeof alternative?.confidence === "number"
        ? Number(alternative.confidence.toFixed(3))
        : null,
    durationSeconds:
      durationSeconds && Number.isFinite(durationSeconds)
        ? Number(durationSeconds.toFixed(3))
        : null,
    paragraphs,
    providerMetadata: {
      provider: "deepgram",
      requestId: payload.metadata?.request_id ?? null,
      sourceModel: resolveSourceModel(payload),
      language: alternative?.languages?.[0]?.trim() || channel?.detected_language?.trim() || null,
      confidence:
        typeof alternative?.confidence === "number"
          ? Number(alternative.confidence.toFixed(3))
          : null,
      paragraphCount: paragraphs.length,
      utteranceCount: alternative?.utterances?.length ?? 0,
      durationSeconds:
        durationSeconds && Number.isFinite(durationSeconds)
          ? Number(durationSeconds.toFixed(3))
          : null,
    },
  };
}

export async function transcribeWithDeepgramResult(file: File, mimeType?: string) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error("Deepgram is not configured.");
  }

  const requestBody = await file.arrayBuffer();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(DEEPGRAM_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": mimeType || file.type || "audio/webm",
        },
        body: requestBody.slice(0),
      });

      const payload = (await response.json().catch(() => null)) as DeepgramResponse | null;

      if (!response.ok) {
        const error = new Error(payload?.err_msg || "Deepgram transcription failed.");

        if (attempt < DEFAULT_MAX_ATTEMPTS && isRetryableStatus(response.status)) {
          await sleep(400 * 2 ** (attempt - 1));
          lastError = error;
          continue;
        }

        throw error;
      }

      return normalizeDeepgramPayload(payload ?? {});
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Deepgram transcription failed.");

      if (attempt < DEFAULT_MAX_ATTEMPTS && isRetryableError(normalizedError)) {
        await sleep(400 * 2 ** (attempt - 1));
        lastError = normalizedError;
        continue;
      }

      throw normalizedError;
    }
  }

  throw lastError ?? new Error("Deepgram transcription failed.");
}
