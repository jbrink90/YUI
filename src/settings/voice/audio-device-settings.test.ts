/**
 * audio-device-settings.test.ts — selected-mic reactive store.
 *
 * Pins the contract for src/settings/voice/audio-device-settings.ts:
 *   createAudioDeviceSettings({ storage? }) store
 */

import { describe, expect, it, vi } from "vitest";
import {
  type AudioDeviceStorage,
  createAudioDeviceSettings,
} from "./audio-device-settings";

function inMemoryStorage(initial: unknown = null): AudioDeviceStorage {
  let value = initial;
  return {
    load: () => value as ReturnType<AudioDeviceStorage["load"]>,
    save: (s) => {
      value = s;
    },
  };
}

describe("createAudioDeviceSettings — defaults", () => {
  it("returns empty deviceId (OS default input) when no storage given", () => {
    const store = createAudioDeviceSettings();
    expect(store.get().deviceId).toBe("");
  });
});

describe("createAudioDeviceSettings — setDeviceId", () => {
  it("updates get().deviceId and notifies subscribers", () => {
    const store = createAudioDeviceSettings();
    const cb = vi.fn();
    store.subscribe(cb);
    store.setDeviceId("mic-1");
    expect(store.get().deviceId).toBe("mic-1");
    expect(cb).toHaveBeenCalledWith({ deviceId: "mic-1" });
  });

  it("an empty deviceId (back to OS default) is a valid stored value", () => {
    const storage = inMemoryStorage();
    const store = createAudioDeviceSettings({ storage });
    store.setDeviceId("mic-1");
    store.setDeviceId("");
    const reloaded = createAudioDeviceSettings({ storage });
    expect(reloaded.get().deviceId).toBe("");
  });
});

describe("createAudioDeviceSettings — storage", () => {
  it("boots from a stored deviceId", () => {
    const store = createAudioDeviceSettings({
      storage: inMemoryStorage({ deviceId: "mic-9" }),
    });
    expect(store.get().deviceId).toBe("mic-9");
  });

  it("rejects a stored value without a string deviceId", () => {
    const store = createAudioDeviceSettings({ storage: inMemoryStorage({ deviceId: 7 }) });
    expect(store.get().deviceId).toBe("");
  });
});
