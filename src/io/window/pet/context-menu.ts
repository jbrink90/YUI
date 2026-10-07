/**
 * Pet-window right-click context menu — mirrors the tray icon's menu
 * (src-tauri/src/tray.rs: Show / Hide Character, Settings…, Quit YUI) so the
 * character and the notification icon offer the same actions. The native popup
 * rides the Tauri Menu API; outside Tauri right-click falls back to the
 * settings opener, matching the pre-menu behavior.
 *
 * showPetContextMenu branches on an injected env for unit testing; the real
 * side effects (Tauri API imports) live in popupNativePetMenu, loaded lazily so
 * vitest and the browser never pull the Tauri modules.
 */

import { createLogger } from "../../../logger";
import { isTauri } from "../../../tauri-env";

const log = createLogger("pet-menu");

export interface PetContextMenuEnv {
  isTauri: boolean;
  /** Real impl builds the native menu and pops it at the cursor. */
  popupNativeMenu: () => void;
  /** Non-Tauri fallback — the menu has no browser equivalent. */
  fallback: () => void;
}

/** Tauri: native popup at cursor; browser: fallback action. No step throws. */
export function showPetContextMenu(env: PetContextMenuEnv): void {
  if (env.isTauri) {
    env.popupNativeMenu();
  } else {
    env.fallback();
  }
}

// Labels mirror src-tauri/src/tray.rs — keep both in sync. IDs must differ from the tray's:
// Tauri dispatches menu events app-wide by ID, so a shared ID fires both handlers.
async function buildNativePetMenu(openSettings: () => void) {
  const [{ Menu, MenuItem }, { getCurrentWindow }, { emit }, { invoke }] = await Promise.all([
    import("@tauri-apps/api/menu"),
    import("@tauri-apps/api/window"),
    import("@tauri-apps/api/event"),
    import("@tauri-apps/api/core"),
  ]);
  const win = getCurrentWindow();
  const toggle = await MenuItem.new({
    id: "pet-toggle-visibility",
    text: "Show / Hide Character",
    action: () => {
      void (async () => {
        const visible = await win.isVisible();
        if (visible) {
          await win.hide();
        } else {
          await win.show();
        }
        await emit("tray_toggle", !visible);
      })().catch((err) => log.warn("toggle_visibility_failed", { error: String(err) }));
    },
  });
  const settings = await MenuItem.new({
    id: "pet-settings",
    text: "Settings…",
    action: openSettings,
  });
  const quit = await MenuItem.new({
    id: "pet-quit",
    text: "Quit YUI",
    action: () => void invoke("quit_app"),
  });
  return Menu.new({ items: [toggle, settings, quit] });
}

/** Return a right-click handler with wired side effects. */
export function createPetContextMenu(deps: { openSettings: () => void }): () => void {
  // Built once: every built menu keeps its item handlers registered, so rebuilding per
  // right-click would stack handlers and fire each action N times.
  let menu: ReturnType<typeof buildNativePetMenu> | null = null;
  const popupNativeMenu = async (): Promise<void> => {
    try {
      menu ??= buildNativePetMenu(deps.openSettings);
      await (await menu).popup();
    } catch (err) {
      menu = null;
      log.warn("pet_menu_popup_failed", { error: String(err) });
    }
  };
  return () => {
    showPetContextMenu({
      isTauri: isTauri(),
      popupNativeMenu: () => void popupNativeMenu(),
      fallback: deps.openSettings,
    });
  };
}
