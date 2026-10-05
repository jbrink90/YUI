/**
 * Microphone picker row for the Input tab: lists audio input devices, commits the pick to the
 * audio-device settings store, and re-lists on hotplug (devicechange).
 */

import {
  type AudioInputDevice,
  enumerateAudioInputDevices,
} from "../../../../io/voice/audio-device-enumeration";
import type { Logger } from "../../../../logger";
import type { createAudioDeviceSettings } from "../../../../settings/voice/audio-device-settings";
import { t } from "../../../i18n";

type AudioDeviceStore = ReturnType<typeof createAudioDeviceSettings>;

export function createMicSelect(deps: {
  select: HTMLSelectElement;
  store: AudioDeviceStore;
  /** Injectable for tests; defaults to the real device enumeration. */
  enumerate?: (opts?: { unlockLabels?: boolean }) => Promise<AudioInputDevice[]>;
  log: Logger;
}) {
  const { select, store, log } = deps;
  const enumerate = deps.enumerate ?? enumerateAudioInputDevices;

  function render(devices: AudioInputDevice[]): void {
    const selected = store.get().deviceId;
    const def = document.createElement("option");
    def.value = "";
    def.textContent = t("voice_input.device_default");
    select.replaceChildren(def);

    let found = selected === "";
    for (const d of devices) {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label;
      select.append(opt);
      if (d.deviceId === selected) found = true;
    }
    // The persisted mic may be unplugged — keep it listed so the row shows what is stored.
    if (!found) {
      const opt = document.createElement("option");
      opt.value = selected;
      opt.textContent = selected;
      select.append(opt);
    }
    select.value = selected;
  }

  async function refresh(unlockLabels = true): Promise<void> {
    render(await enumerate({ unlockLabels }));
  }

  function onChange(): void {
    store.setDeviceId(select.value);
    log.info("mic_device_change", { deviceId: select.value });
  }

  // Labels were unlocked when the panel opened, so a hotplug re-list never re-prompts.
  const onDeviceChange = (): void => {
    void refresh(false);
  };

  navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
  select.addEventListener("change", onChange);
  const unsubscribe = store.subscribe(() => {
    select.value = store.get().deviceId;
  });

  return {
    refresh,
    dispose() {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      select.removeEventListener("change", onChange);
      unsubscribe();
      select.replaceChildren();
    },
  };
}
