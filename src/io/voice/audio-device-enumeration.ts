/**
 * Audio input device enumeration.
 * Lists available audio input devices for the mic picker.
 */

import { createLogger } from "../../logger";

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

const log = createLogger("audio-device");

function releaseTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

async function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

function toAudioInputDevice(d: MediaDeviceInfo): AudioInputDevice {
  return {
    deviceId: d.deviceId,
    label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
  };
}

/**
 * Enumerates available audio input devices. With `unlockLabels` (default), the first call
 * acquires a temporary stream so the OS releases device labels; without it the call never
 * prompts and labels may come back as fallbacks.
 */
export async function enumerateAudioInputDevices(opts?: {
  unlockLabels?: boolean;
}): Promise<AudioInputDevice[]> {
  try {
    let inputs = await listAudioInputs();
    if (opts?.unlockLabels !== false && inputs.length > 0 && inputs.every((d) => !d.label)) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      releaseTracks(stream);
      inputs = await listAudioInputs();
    }
    log.info("devices_enumerated", { count: inputs.length });
    return inputs.map(toAudioInputDevice);
  } catch (err) {
    log.warn("enumeration_failed", { error: String(err) });
    return [];
  }
}
