import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { DIAnalysisResult } from "../typings";
import { ImageAnalyzer } from "./image-analyzer";

declare global {
  interface HTMLElementTagNameMap {
    "upload-form": UploadForm;
  }
}

@customElement("upload-form")
export class UploadForm extends LitElement {
  @property()
  status: "uploading" | "uploaded" | "previewing" | "ready" | "error" = "ready";

  @property()
  previewUrl: string | undefined;

  @property()
  pageAnalysisResult: DIAnalysisResult | undefined;

  @property()
  imageAnalyzer?: ImageAnalyzer | null = null;

  constructor() {
    super();
  }



  async _onSubmit(e: Event) {
    e.preventDefault();
    const input = this.shadowRoot?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (!input?.files?.length) return;
    this.status = "uploading";
    // Simulate upload
    try {
    } catch {
      this.status = "error";
    }

    // encode the image in base64
    const file = input.files![0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      console.log(`data:${file.type};base64,${base64}`);
      await this.postBase64ImageToEndpoint(base64 as string);
      this.status = "uploaded";
    };
    reader.onerror = () => {
      this.status = "error";
    };
    reader.readAsDataURL(file);
  }

  async postBase64ImageToEndpoint(base64: string) {
    const result = await fetch("http://localhost:3333/analyze-base64", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image: base64,
        documentName: "uploaded-document",
      }),
    });
    if (!result.ok) {
      throw new Error("Failed to upload image");
    }

    const json =( await result.json()) as unknown as DIAnalysisResult;

    if (json.status !== 'succeeded') {
      this.status = 'error';
       this.pageAnalysisResult = undefined
      return;
    }

    this.pageAnalysisResult = json;
    this.createAnalysisElement();
    this.status = "uploaded";
  }

  relayButtonClicks = (e: MouseEvent) => {
    const target =
      e.target instanceof Element && e.target.closest('button[type="button"]');
    if (!target) {
      return;
    }
    e.preventDefault();

    const input = this.shadowRoot?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (!input) {
      return;
    }

    input.click();
  };

  handleInputChange = (e: Event) => {
    const target =
      e.target instanceof Element &&
      (e.target.closest('input[type="file"]') as HTMLInputElement);
    if (!target) {
      return;
    }

    if (!target?.files?.length) {
      return;
    }
    console.log(target.files[0]);
    const previewURL = window.URL.createObjectURL(target.files[0]);
    if (previewURL) {
      this.previewUrl = previewURL;
      this.status = "previewing";
    }
  };

  getTextByStatus() {
    switch (this.status) {
      case "ready":
        return "Choose a file to preview below";
      case "previewing":
        return "Previewing your file";
      case "uploading":
        return "Uploading ...";
      case "uploaded":
        return "Uploaded!";
      case "error":
        return "Error during upload";
      default:
        // should not happen
        return "Choose file";
    }
  }

  async createAnalysisElement() {
      if (!this.previewUrl && !this.pageAnalysisResult) {
        return;
      }
    const element = new ImageAnalyzer(this.previewUrl, this.pageAnalysisResult);
      if (!element) {
        return;
      }
    
    this.imageAnalyzer = element;
  }

  override render() {
    return html`
      <div class="layout-padding padding-bottom-md">
        <shared-stylesheet style-id="global-styles"></shared-stylesheet>

        <form @submit=${this._onSubmit}>
          <article
            class="card width-250 margin-block-md position-relative"
            style="min-height: 250px;"
          >
            <div class="card-content">
              <div class="image margin-bottom-md">
                <svg
                  ?hidden=${!!this.previewUrl}
                  viewBox="0 0 48 48"
                  fill="CanvasText"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M24 13C24 19.0751 19.0751 24 13 24C6.92487 24 2 19.0751 2 13C2 6.92487 6.92487 2 13 2C19.0751 2 24 6.92487 24 13ZM14 6C14 5.44772 13.5523 5 13 5C12.4477 5 12 5.44772 12 6V12H6C5.44771 12 5 12.4477 5 13C5 13.5523 5.44771 14 6 14H12V20C12 20.5523 12.4477 21 13 21C13.5523 21 14 20.5523 14 20V14H20C20.5523 14 21 13.5523 21 13C21 12.4477 20.5523 12 20 12H14V6ZM35.75 8.5C37.8211 8.5 39.5 10.1789 39.5 12.25V35.75C39.5 36.413 39.3279 37.0358 39.0261 37.5762L26.475 25.0251C25.1081 23.6583 22.8921 23.6583 21.5252 25.0251L8.97401 37.5763C8.67208 37.0359 8.5 36.413 8.5 35.75V25.2001C7.61768 24.8745 6.78039 24.456 6 23.9564V35.75C6 39.2018 8.79822 42 12.25 42H35.75C39.2018 42 42 39.2018 42 35.75V12.25C42 8.79822 39.2018 6 35.75 6H23.9564C24.456 6.78039 24.8745 7.61768 25.2001 8.5H35.75ZM37.1459 39.2316C36.7144 39.4047 36.2433 39.5 35.75 39.5H12.25C11.7567 39.5 11.2857 39.4048 10.8542 39.2316L23.293 26.7929C23.6835 26.4024 24.3167 26.4024 24.7072 26.7929L37.1459 39.2316ZM26 17.5C26 15.0147 28.0147 13 30.5 13C32.9853 13 35 15.0147 35 17.5C35 19.9853 32.9853 22 30.5 22C28.0147 22 26 19.9853 26 17.5ZM30.5 15.5C29.3954 15.5 28.5 16.3954 28.5 17.5C28.5 18.6046 29.3954 19.5 30.5 19.5C31.6046 19.5 32.5 18.6046 32.5 17.5C32.5 16.3954 31.6046 15.5 30.5 15.5Z"
                    fill="#212121"
                  />
                </svg>

                <img
                  src=${this.previewUrl}
                  ?hidden=${!this.previewUrl}
                  alt="File preview"
                  style="display: block;"
                />
              </div>
              <p>${this.getTextByStatus()}</p>
              <progress
                .hidden=${this.status !== "uploading"}
                class="progress-bar margin-top-md position-absolute bottom-0 left-0 right-0"
                max="100"
              ></progress>
            </div>
          </article>
          <label>
            <button
              class="button"
              type="button"
              @change
              @click=${this.relayButtonClicks}
              ?disabled=${this.status !== "ready"}
            >
              Choose file
            </button>
            <input
              hidden
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
              @change=${this.handleInputChange}
              type="file"
              name="file"
              ?disabled=${this.status === "uploading" ||
              this.status === "uploaded"}
            />
          </label>
          <button
            class="button button-primary button-filled"
            type="submit"
            @submit=${this.postBase64ImageToEndpoint}
            ?disabled=${this.status !== "previewing"}
          >
            ${this.status === "uploading" ? "Uploading..." : "Upload"}
          </button>
        </form>
        <div>
          ${this.imageAnalyzer}
        </div>
      </div>
    `;
  }
}
