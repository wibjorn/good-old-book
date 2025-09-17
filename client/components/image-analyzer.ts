import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { DIAnalysisResult } from "../typings";

declare global {
  interface HTMLElementTagNameMap {
    "image-analyzer": ImageAnalyzer;
  }
}

@customElement("image-analyzer")
export class ImageAnalyzer extends LitElement {
  static override styles = css``;

  @property()
  imageElement!: HTMLImageElement;

  @property()
  pageAnalysisResult: DIAnalysisResult | undefined;

  @property()
  imageUrl!: string | undefined;

  override firstUpdated() {
    const image = this.renderRoot.querySelector(
      "img[data-original-image]"
    ) as HTMLImageElement;
    if (image) {
      this.imageElement = image;
    }
  }

  get imageDisplayWidth() {
    return this.imageElement?.clientWidth;
  }

  get imageDisplayHeight() {
    return this.imageElement?.clientHeight;
  }

  get imageIntrinsicHeight() {
    return this.pageAnalysisResult?.analyzeResult.pages[0]?.height;
  }

  get imageIntrinsicWidth() {
    return this.pageAnalysisResult?.analyzeResult.pages[0]?.width;
  }

  constructor(
    imageUrl: string | undefined,
    pageAnalysisResult: DIAnalysisResult | undefined
  ) {
    super();
    this.imageUrl = imageUrl;
    this.pageAnalysisResult = pageAnalysisResult;
  }

  override connectedCallback(): void {
    super.connectedCallback();
  }

  override render() {
    return html`<div>
      <shared-stylesheet style-id="global-styles"></shared-stylesheet>
      <div class="margin-top-xs">
        <div class="markdown">
          <h2>Analyize your upload</h2>
        </div>
        <div class="image">
          <img data-original-image src=${this.imageUrl} />
        </div>
      </div>
      ${this.metadataTemplate()}
    </div>`;
  }

  metadataTemplate = () => html`<details class="accordion" open>
    <summary>
      <div class="accordion-header">Metadata</div>
    </summary>
    <div class="accordion-content">
      <table class="table">
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Intrinsic Width</td>
          <td>${this.imageIntrinsicWidth ?? "N/A"}</td>
        </tr>
        <tr>
          <td>Intrinsic Height</td>
          <td>${this.imageIntrinsicHeight ?? "N/A"}</td>
        </tr>
        <tr>
          <td>Display Width</td>
          <td>${this.imageDisplayWidth ?? "N/A"}</td>
        </tr>
        <tr>
          <td>Display Height</td>
          <td>${this.imageDisplayHeight ?? "N/A"}</td>
        </tr>
      </table>
    </div>
  </details>`;
}
