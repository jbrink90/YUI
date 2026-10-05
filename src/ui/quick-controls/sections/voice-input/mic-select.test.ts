// @vitest-environment jsdom
/**
 * mic-select.test.ts — Input tab microphone picker.
 *
 * Pins the contract for src/ui/quick-controls/sections/voice-input/mic-select.ts:
 *   renders the enumerated devices + a System default option, selects the stored deviceId,
 *   and commits the pick on change.
 */

import { describe, expect, it, vi } from "vitest";
import { createAudioDeviceSettings } from "../../../../settings/voice/audio-device-settings";
import { createMicSelect } from "./mic-select";

const noopLog = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function setup(devices: { deviceId: string; label: string }[] = []) {
  const select = document.createElement("select");
  const store = createAudioDeviceSettings();
  const mic = createMicSelect({
    select,
    store,
    enumerate: vi.fn(async () => devices),
    log: noopLog,
  });
  return { select, store, mic };
}

describe("createMicSelect — render", () => {
  it("lists the OS default plus every enumerated device", async () => {
    const { select, mic } = setup([
      { deviceId: "mic-a", label: "Desk Mic" },
      { deviceId: "mic-b", label: "Headset" },
    ]);
    await mic.refresh();

    const options = [...select.options].map((o) => [o.value, o.textContent]);
    expect(options).toEqual([
      ["", "System default"],
      ["mic-a", "Desk Mic"],
      ["mic-b", "Headset"],
    ]);
  });

  it("selects the stored deviceId", async () => {
    const { select, store, mic } = setup([{ deviceId: "mic-a", label: "Desk Mic" }]);
    store.setDeviceId("mic-a");
    await mic.refresh();
    expect(select.value).toBe("mic-a");
  });

  it("keeps an unplugged stored device listed and selected", async () => {
    const { select, store, mic } = setup([{ deviceId: "mic-a", label: "Desk Mic" }]);
    store.setDeviceId("mic-gone");
    await mic.refresh();
    expect(select.value).toBe("mic-gone");
    expect([...select.options].map((o) => o.value)).toContain("mic-gone");
  });
});

describe("createMicSelect — pick", () => {
  it("commits the picked deviceId to the store", async () => {
    const { select, store, mic } = setup([{ deviceId: "mic-a", label: "Desk Mic" }]);
    await mic.refresh();
    select.value = "mic-a";
    select.dispatchEvent(new Event("change"));
    expect(store.get().deviceId).toBe("mic-a");
  });
});
