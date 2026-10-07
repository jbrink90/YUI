import { describe, expect, it, vi } from "vitest";
import { type PetContextMenuEnv, showPetContextMenu } from "./context-menu";

describe("showPetContextMenu", () => {
  it("routes to popupNativeMenu when isTauri is true", () => {
    const popupNativeMenu = vi.fn();
    const fallback = vi.fn();
    const env: PetContextMenuEnv = { isTauri: true, popupNativeMenu, fallback };

    showPetContextMenu(env);

    expect(popupNativeMenu).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("routes to fallback when isTauri is false", () => {
    const popupNativeMenu = vi.fn();
    const fallback = vi.fn();
    const env: PetContextMenuEnv = { isTauri: false, popupNativeMenu, fallback };

    showPetContextMenu(env);

    expect(fallback).toHaveBeenCalledOnce();
    expect(popupNativeMenu).not.toHaveBeenCalled();
  });
});
