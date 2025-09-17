import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "simple-greeting": SimpleGreeting;
  }
}

@customElement("simple-greeting")
export class SimpleGreeting extends LitElement {
  static override styles = css``;

  override connectedCallback(): void {
    super.connectedCallback();
  }

  override render() {
    return html`<div>
      <shared-stylesheet style-id="global-styles"></shared-stylesheet>
      <div class="layout-padding padding-block-lg">
        <h1 class="font-size-lg font-weight-bold ">Add text</h1>
        <p>Welcome to Good Old Book, an application that leverages Azure's AI Vision capabilities to bring historical texts to life.</p>
      </div>
    </div>`;
  }
}
