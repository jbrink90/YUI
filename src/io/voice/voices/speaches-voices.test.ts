import { describe, expect, it, vi } from "vitest";
import { listSpeachesModels, listSpeachesVoices } from "./speaches-voices";

const noopLog = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

function jsonFetch(body: unknown, status = 200) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

describe("listSpeachesModels", () => {
  it("lists the installed text-to-speech model ids", async () => {
    const fetch = jsonFetch({
      data: [{ id: "speaches-ai/Kokoro-82M-v1.0-ONNX" }, { id: "rhasspy/piper-en" }, {}],
    });

    const models = await listSpeachesModels({
      baseUrl: "http://localhost:8000",
      fetch: fetch as unknown as typeof globalThis.fetch,
      logger: noopLog,
    });

    expect(fetch.mock.calls[0]![0]).toBe("http://localhost:8000/v1/models?task=text-to-speech");
    expect(models).toEqual(["speaches-ai/Kokoro-82M-v1.0-ONNX", "rhasspy/piper-en"]);
  });

  it("resolves null when the server refuses", async () => {
    const fetch = jsonFetch({}, 500);
    await expect(
      listSpeachesModels({
        baseUrl: "http://localhost:8000",
        fetch: fetch as unknown as typeof globalThis.fetch,
        logger: noopLog,
      }),
    ).resolves.toBeNull();
  });
});

describe("listSpeachesVoices", () => {
  it("lists the selected model's voices by name, keeping the repo path's slash", async () => {
    const fetch = jsonFetch({
      id: "speaches-ai/Kokoro-82M-v1.0-ONNX",
      voices: [
        { name: "af_heart", language: "en-us", gender: "female" },
        { name: "am_onyx", language: "en-us", gender: "male" },
      ],
    });

    const voices = await listSpeachesVoices({
      baseUrl: "http://localhost:8000",
      model: "speaches-ai/Kokoro-82M-v1.0-ONNX",
      fetch: fetch as unknown as typeof globalThis.fetch,
      logger: noopLog,
    });

    expect(fetch.mock.calls[0]![0]).toBe(
      "http://localhost:8000/v1/models/speaches-ai/Kokoro-82M-v1.0-ONNX",
    );
    expect(voices).toEqual([
      { id: "af_heart", label: "af_heart (en-us)" },
      { id: "am_onyx", label: "am_onyx (en-us)" },
    ]);
  });

  it("lists nothing without a model and does not call the server", async () => {
    const fetch = jsonFetch({});
    await expect(
      listSpeachesVoices({
        baseUrl: "http://localhost:8000",
        fetch: fetch as unknown as typeof globalThis.fetch,
        logger: noopLog,
      }),
    ).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
