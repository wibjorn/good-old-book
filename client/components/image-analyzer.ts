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
  static override styles = css`
    .image-overlay {
      position: absolute;
      inset: 0;
    }

    svg {
      position: absolute;
      inset: 0;
    }

    polygon {
      stroke: black;
    }
  `;

  @property()
  imageElement!: HTMLImageElement;

  @property()
  pageAnalysisResult: DIAnalysisResult | undefined;

  @property()
  imageUrl!: string | undefined;

  @property()
  mode: "none" | "text-region" = "none";

  @property()
  activeRegionContent: string = "";

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
          <h2 class="margin-bottom-md">Analyize your upload</h2>
        </div>
        ${this.activeRegionMenuTemplate()}
        <div class="image position-relative">
          <img data-original-image src=${this.imageUrl} />
          <div class="image-overlay">${this.createBoundingElements()}</div>
        </div>
      </div>
      ${this.metadataTemplate()} ${this.rawTextTemplate()}
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

  rawTextTemplate = () => {
    if (!this.pageAnalysisResult) {
      return html``;
    }
    return html`<details class="accordion" open>
      <summary>
        <div class="accordion-header">Raw Text</div>
      </summary>
      <div class="accordion-content">
        <pre>${this.pageAnalysisResult.analyzeResult.content}</pre>
      </div>
    </details>`;
  };

  activeRegionMenuTemplate = () => {
    if (this.mode === "text-region") {
      return html`
      <div>
          <p>Your selection</p>
          <div style="white-space: wrap" class="padding-xs border border-radius-lg">
              ${this.activeRegionContent}
          </div>
          <div class="buttons margin-block-md">
              <button class="button" @click=${this.summarizeRegion()}>Summarize text 🚧</button>
              <button class="button" @click=${this.modernizeRegion()}>Modernize text 🚧</button>
          </div>
      </div>
      `;
    }

    return html``;
  };

  private createBoundingElements(): unknown {
    const paragraphs = this.pageAnalysisResult?.analyzeResult.paragraphs || [];
    const figures = this.pageAnalysisResult?.analyzeResult.figures || [];
    const paraTemps = paragraphs.map((para) => {
      const content =  para.content;
      const svgs = para.boundingRegions.map((region, i) => {
        const points = region.polygon;
        if (!points) return null;

        // convert polygon to a [x, y] tuple array
        const coords = convertPointsToUsableXYCoordinates(points);

        // create an svg poly
        const svg = html`
          <svg            
            id="bounding-region-${i}"
            xmlns="http://www.w3.org/2000/svg"
            width=${this.imageIntrinsicWidth}
            height=${this.imageIntrinsicHeight}
            viewBox="0 0  ${this.imageIntrinsicWidth} ${this
              .imageIntrinsicHeight}"
          >
            <polygon
              role="button"
              @click=${() => this.setActiveRegion(content)}
              style="cursor: pointer; z-index: 3"
              fill="rgba(255, 0, 0, 0.09)"
              points="${coords.map((c) => `${c.x},${c.y}`).join(" ")}"
              stroke-width="3"
            />
          </svg>
        `;
        return svg;
      });
      return svgs;
    });

    const figTemps = figures.map((fig) => {
      const svgs = fig.boundingRegions.map((region, i) => {
        const points = region.polygon;
        if (!points) return null;

        // convert polygon to a [x, y] tuple array
        const coords = convertPointsToUsableXYCoordinates(points);

        // create an svg poly
        const svg = html`
          <svg
            role="button"
            id="bounding-region-${i}"
            xmlns="http://www.w3.org/2000/svg"
            width=${this.imageIntrinsicWidth}
            height=${this.imageIntrinsicHeight}
            viewBox="0 0  ${this.imageIntrinsicWidth} ${this
              .imageIntrinsicHeight}"
          >
            <polygon
              fill="rgba(30, 0, 255, 0.09)"
              points="${coords.map((c) => `${c.x},${c.y}`).join(" ")}"
              stroke-width="3"
            />
          </svg>
        `;
        return svg;
      });
      return svgs;
    });

    return [...paraTemps.flat(), ...figTemps.flat()];
  }

  setActiveRegion(content: string): void {
    this.mode = "text-region";
    this.activeRegionContent = content;
  }

modernizeRegion(): unknown {
      throw new Error("Method not implemented.");
  }

  summarizeRegion(): unknown {
      throw new Error("Method not implemented.");
  }
}

/**
 *
 * Bounding polygon on the page, or the entire page if not specified.
 * Coordinates specified relative to the top-left of the page. The numbers
 * represent the x, y values of the polygon vertices, clockwise from the left
 * (-180 degrees inclusive) relative to the element orientation.
 */
function convertPointsToUsableXYCoordinates(
  points: number[]
): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i += 2) {
    result.push({ x: points[i], y: points[i + 1] });
  }
  return result;
}
