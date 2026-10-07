import { describe, expect, it, vi } from "vitest";
import { createChatModelLister, listChatModels } from "./chat-models";

const noopLog = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe("listChatModels", () => {
  it("lists the OpenAI-compatible /models ids sorted, with the key as Bearer", async () => {
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ data: [{ id: "qwen3:8b" }, { id: "llama3.2" }, {}] })),
    );

    const models = await listChatModels({
      baseUrl: "http://localhost:11434/v1/",
      apiKey: "sk-x",
      fetch: fetch as unknown as typeof globalThis.fetch,
      logger: noopLog,
    });

    expect(fetch.mock.calls[0]![0]).toBe("http://localhost:11434/v1/models");
    expect(fetch.mock.calls[0]![1]?.headers).toEqual({ Authorization: "Bearer sk-x" });
    expect(models).toEqual(["llama3.2", "qwen3:8b"]);
  });

  it("resolves null when the server refuses", async () => {
    const fetch = vi.fn(async () => new Response("no", { status: 401 }));
    await expect(
      listChatModels({
        baseUrl: "http://localhost:11434/v1",
        fetch: fetch as unknown as typeof globalThis.fetch,
        logger: noopLog,
      }),
    ).resolves.toBeNull();
  });
});

describe("createChatModelLister", () => {
  it("lists nothing in push mode or before config loads", async () => {
    const push = createChatModelLister({
      getEndpoints: () => ({ chat_base_url: "wss://x", chat_api: "push" }),
      getApiKey: async () => undefined,
      log: noopLog,
    });
    const unloaded = createChatModelLister({
      getEndpoints: () => {
        throw new Error("config not loaded");
      },
      getApiKey: async () => undefined,
      log: noopLog,
    });

    await expect(push()).resolves.toBeNull();
    await expect(unloaded()).resolves.toBeNull();
  });
});
