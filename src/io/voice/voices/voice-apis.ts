/** Voice operations per TTS provider — the speaker list, import, delete and re-upload dispatch here. */

import type { TtsProviderName } from "../../../contract";
import { deleteFishVoice, listFishVoices, upsertFishVoice } from "./fish-voices";
import {
  deleteVoice,
  listVoices,
  type UpsertVoiceOptions,
  upsertVoice,
  type VoiceEntry,
  type VoicesRequestOptions,
} from "./tts-voices";

/**
 * One list/import/delete bundle per provider. `upsert` resolves the server-assigned voice id when
 * the server names its own (Fish's trained models) and nothing otherwise.
 */
export interface VoiceApi {
  list: (opts: VoicesRequestOptions) => Promise<VoiceEntry[] | null>;
  /** Absent: the provider takes no uploaded voices, so import, delete and re-upload are off. */
  upsert?: (opts: UpsertVoiceOptions) => Promise<string | undefined>;
  remove?: typeof deleteVoice;
  /** true: an upload keeps the caller's voice id, so a lost clip can be uploaded again under it. */
  keepsId?: boolean;
  /** true: the provider speaks any voice id, not just listed ones — the panel offers a paste-id field. */
  manualId?: boolean;
}

/** OpenAI's built-in voices; `tts-1` models speak only some of them. */
const OPENAI_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
];

/** List voices from an OpenAI-compatible server (e.g., speaches). Falls back to hardcoded OpenAI voices. */
async function listOpenAiVoices(opts: VoicesRequestOptions): Promise<VoiceEntry[]> {
  // Only query the server if it's not the official OpenAI API
  if (!opts.baseUrl.includes("api.openai.com")) {
    try {
      const voices = await listVoices(opts);
      if (voices && voices.length > 0) {
        return voices.map((id) => ({ id }));
      }
    } catch {
      // Fall through to hardcoded list on error
    }
  }
  return OPENAI_VOICES.map((id) => ({ id }));
}

/** A provider absent here has no voice list. */
export const VOICE_APIS: Partial<Record<TtsProviderName, VoiceApi>> = {
  irodori: {
    list: async (opts) => (await listVoices(opts))?.map((id) => ({ id })) ?? null,
    upsert: upsertVoice,
    remove: deleteVoice,
    keepsId: true,
  },
  openai: { list: listOpenAiVoices },
  fish: { list: listFishVoices, upsert: upsertFishVoice, remove: deleteFishVoice, manualId: true },
};
