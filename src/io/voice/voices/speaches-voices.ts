/**
 * Speaches' model API — the installed TTS models and each model's voices. Voices belong to a
 * model on Speaches (a Kokoro voice name means nothing to Piper), so the voice list is read from
 * the selected model rather than the server-wide `/v1/audio/voices`.
 */

import { createLogger } from "../../../logger";
import { createDeadlineSignal, untilAborted } from "../deadline";
import {
  authHeaders,
  VOICES_REQUEST_TIMEOUT_MS,
  type VoiceEntry,
  type VoicesRequestOptions,
} from "./tts-voices";

/** GETs a JSON body, or null on a non-2xx / thrown request / timeout. */
async function getJson(opts: VoicesRequestOptions, path: string): Promise<unknown | null> {
  const log = opts.logger ?? createLogger("speaches-voices");
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const deadline = createDeadlineSignal(VOICES_REQUEST_TIMEOUT_MS, "Speaches request timed out");
  try {
    const res = await untilAborted(
      fetchImpl(`${opts.baseUrl}${path}`, {
        headers: await authHeaders(opts.getApiKey),
        signal: deadline.signal,
      }),
      deadline.signal,
    );
    if (!res.ok) {
      log.warn("speaches_request_failed", { path, status: res.status });
      return null;
    }
    return await untilAborted(res.json(), deadline.signal);
  } catch (err) {
    log.warn("speaches_request_failed", { path, error: String(err) });
    return null;
  } finally {
    deadline.clear();
  }
}

/** The TTS models installed on the server, by id; null when the server could not be read. */
export async function listSpeachesModels(opts: VoicesRequestOptions): Promise<string[] | null> {
  const body = (await getJson(opts, "/v1/models?task=text-to-speech")) as {
    data?: Array<{ id?: unknown }>;
  } | null;
  if (!body) return null;
  return (body.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** The selected model's voices; an unset model lists none, an unreadable server resolves null. */
export async function listSpeachesVoices(opts: VoicesRequestOptions): Promise<VoiceEntry[] | null> {
  if (!opts.model) return [];
  // Model ids are Hugging Face repo paths ("org/name"); the route takes the slash as-is.
  const modelPath = opts.model.split("/").map(encodeURIComponent).join("/");
  const body = (await getJson(opts, `/v1/models/${modelPath}`)) as {
    voices?: Array<{ name?: unknown; language?: unknown }>;
  } | null;
  if (!body) return null;
  return (body.voices ?? []).flatMap((v) =>
    typeof v.name === "string" && v.name.length > 0
      ? [
          {
            id: v.name,
            label: typeof v.language === "string" ? `${v.name} (${v.language})` : v.name,
          },
        ]
      : [],
  );
}
