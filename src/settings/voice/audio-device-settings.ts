/**
 * Reactive settings store for audio input device selection.
 * Persists the selected audio input device ID to localStorage.
 */

import { createPersistedStore, localStorageStore, type PersistedStorage } from "../persisted-store";

export interface AudioDeviceSettings {
  deviceId: string;
}

export type AudioDeviceStorage = PersistedStorage<AudioDeviceSettings>;

function isValidSettings(v: unknown): v is AudioDeviceSettings {
  if (v === null || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s.deviceId === "string";
}

export function createAudioDeviceSettings(opts?: { storage?: AudioDeviceStorage }) {
  const core = createPersistedStore<AudioDeviceSettings>({
    storage: opts?.storage,
    defaults: { deviceId: "" },
    parse: (v) => (isValidSettings(v) ? v : null),
    equals: (a, b) => a.deviceId === b.deviceId,
  });

  return {
    get: core.get,

    setDeviceId(deviceId: string): void {
      if (typeof deviceId !== "string") return;
      core.commit({ deviceId });
    },

    reloadFromStorage: core.reloadFromStorage,
    subscribe: core.subscribe,
    dispose: core.dispose,
  };
}

/** localStorage-backed AudioDeviceStorage adapter. */
export function localStorageAudioDeviceStorage(key = "yui.audioDevice"): AudioDeviceStorage {
  return localStorageStore<AudioDeviceSettings>(key);
}
