import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

export const stylesheetCache = new Map();

declare global {
  interface HTMLElementTagNameMap {
    "shared-stylesheet": SharedStylesheet;
  }
}


@customElement("shared-stylesheet")
export class SharedStylesheet extends LitElement {
  @property()
  override id!: string;

  override connectedCallback(): void {
    super.connectedCallback();
    const id = this.getAttribute("style-id");
    if (!id) {
      throw new Error("style-id attribute is required");
    }
    const root = this.getRootNode();
    let styles: CSSStyleSheet | undefined = stylesheetCache.get(id);

    if (styles) {
      (root as ShadowRoot).adoptedStyleSheets.push(styles);
    } else {
      styles = new CSSStyleSheet();

      const stylesheets = Array.from((document as Document).styleSheets);
      if (!stylesheets || stylesheets.length === 0) {
        throw new Error("No stylesheets found in document");
      }

      const stylesheetToCopy = stylesheets.find((stylesheet) => {
        if (stylesheet.ownerNode &&
          (stylesheet.ownerNode as HTMLLinkElement)?.id === id) {
          return true;
        } else {
          return false;
        }
      });

      if (!stylesheetToCopy) {
        throw new Error(`Link element with id ${id} not found`);
      }

      const cssText = Array.from(stylesheetToCopy.cssRules)
        .map((rule) => rule.cssText)
        .join("");

      styles.replaceSync(cssText);
      stylesheetCache.set(id, styles);
      console.log({ styles });
      (this.getRootNode() as ShadowRoot)?.adoptedStyleSheets.push(styles);
    }

    this.remove();
  }
}
