/**
 * The chat server's model list — `GET {chat_base_url}/models`, the OpenAI-compatible listing that
 * Ollama, LM Studio, OpenAI and Groq all serve. Push mode has no model of its own, so it lists none.
 */

import type { EndpointsConfig } from "../../../contract";
import type { Logger } from "../../../logger";
import { createDeadlineSignal, untilAborted } from "../../voice/deadline";
import { selectFetch } from "../stream/chat-client";

const CHAT_MODELS_TIMEOUT_MS = 10_000;

interface ListChatModelsOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof fetch;
  logger?: Logger;
}

/** The server's model ids, sorted; null when the server could not be read. */
export async function listChatModels(opts: ListChatModelsOptions): Promise<string[] | null> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const deadline = createDeadlineSignal(CHAT_MODELS_TIMEOUT_MS, "chat model list timed out");
  try {
    const res = await untilAborted(
      fetchImpl(`${opts.baseUrl.replace(/\/+$/, "")}/models`, {
        headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
        signal: deadline.signal,
      }),
      deadline.signal,
    );
    if (!res.ok) {
      opts.logger?.warn("chat_models_failed", { status: res.status });
      return null;
    }
    const body = (await untilAborted(res.json(), deadline.signal)) as {
      data?: Array<{ id?: unknown }>;
    };
    return (body.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .sort((a, b) => a.localeCompare(b));
  } catch (err) {
    opts.logger?.warn("chat_models_failed", { error: String(err) });
    return null;
  } finally {
    deadline.clear();
  }
}

/** Lists the live chat server's models, or null where the endpoints name no request-shaped server. */
export function createChatModelLister(deps: {
  getEndpoints: () => Pick<EndpointsConfig, "chat_base_url" | "chat_api"> | null;
  getApiKey: () => Promise<string | undefined>;
  log: Logger;
}): () => Promise<string[] | null> {
  return async () => {
    // getEndpoints throws until config loads; the panel can open before that.
    let eps: Pick<EndpointsConfig, "chat_base_url" | "chat_api"> | null;
    try {
      eps = deps.getEndpoints();
    } catch {
      return null;
    }
    if (!eps?.chat_base_url || eps.chat_api === "push") return null;
    return listChatModels({
      baseUrl: eps.chat_base_url,
      apiKey: (await deps.getApiKey())?.trim() || undefined,
      fetch: await selectFetch(),
      logger: deps.log,
    });
  };
}
