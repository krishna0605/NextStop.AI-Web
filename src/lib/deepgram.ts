import "server-only";

export async function transcribeWithDeepgram(file: File, mimeType?: string) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error("Deepgram is not configured.");
  }

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType || file.type || "audio/webm",
      },
      body: await file.arrayBuffer(),
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        results?: {
          channels?: Array<{
            alternatives?: Array<{
              transcript?: string;
            }>;
          }>;
        };
        err_msg?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.err_msg || "Deepgram transcription failed.");
  }

  const transcript =
    payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";

  if (!transcript) {
    throw new Error("Deepgram returned an empty transcript.");
  }

  return transcript;
}
