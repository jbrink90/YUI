/**
 * Model dropdown — once the live server lists its models, a `<select>` of them stands in for the
 * model text field. "Default" keeps the field empty (the bundled model) and "Custom" brings the text
 * field back for an id the server does not list. A server that lists nothing keeps the plain field.
 *
 * The text input stays the single write path: a pick sets its value and fires its `change`, so the
 * endpoints section commits it exactly as if it had been typed.
 */

import { t } from "../../i18n";

const CUSTOM = "\u0000custom";

interface ModelSelectDeps {
  /** The model text input; its `.yui-input-wrap` is swapped for the select. */
  input: HTMLInputElement;
  /** The live server's model ids; null when it lists none or the read failed. */
  listModels: () => Promise<string[] | null>;
}

export interface ModelSelect {
  /** Refetch the list — on panel open and whenever the server moves. */
  reload(): void;
  /** Mirror the input's value onto the select — after every endpoints reflect. */
  sync(): void;
  dispose(): void;
}

export function createModelSelect(deps: ModelSelectDeps): ModelSelect {
  const { input, listModels } = deps;
  const wrap = input.closest<HTMLElement>(".yui-input-wrap")!;
  const select = document.createElement("select");
  select.className = "yui-select yui-model-select";
  select.setAttribute("aria-label", input.labels?.[0]?.textContent ?? "");
  select.hidden = true;
  wrap.after(select);

  let models: readonly string[] = [];
  // Set by "Custom": the text field shows under the select until a listed model is picked.
  let custom = false;
  // Drops a slower, older reply that would overwrite a newer server's models.
  let generation = 0;
  let disposed = false;

  function option(value: string, label: string): HTMLOptionElement {
    const el = document.createElement("option");
    el.value = value;
    el.textContent = label;
    return el;
  }

  function sync(): void {
    const listed = models.length > 0;
    select.hidden = !listed;
    wrap.hidden = listed && !custom;
    if (!listed) return;
    const value = input.value;
    const fallback = input.placeholder;
    // A configured model the server does not list stays pickable instead of silently vanishing.
    const extra = value && !models.includes(value) ? [value] : [];
    select.replaceChildren(
      option(
        "",
        fallback ? `${t("endpoints.model_default")} (${fallback})` : t("endpoints.model_default"),
      ),
      ...[...extra, ...models].map((id) => option(id, id)),
      option(CUSTOM, t("svc.chat_preset_custom")),
    );
    select.value = custom ? CUSTOM : value;
  }

  function handleChange(): void {
    if (select.value === CUSTOM) {
      custom = true;
      sync();
      input.focus();
      return;
    }
    custom = false;
    input.value = select.value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    sync();
  }
  select.addEventListener("change", handleChange);

  return {
    reload(): void {
      const mine = ++generation;
      void listModels()
        .catch(() => null)
        .then((next) => {
          if (disposed || mine !== generation) return;
          models = next ?? [];
          sync();
        });
    },
    sync,
    dispose(): void {
      disposed = true;
      select.removeEventListener("change", handleChange);
      select.remove();
      wrap.hidden = false;
    },
  };
}
