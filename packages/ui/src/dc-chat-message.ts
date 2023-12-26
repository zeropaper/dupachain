import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("dc-chat-message")
export class ChatMessageElement extends LitElement {
  @property({ type: Boolean })
  loading = false;

  @property({ type: String })
  role: "user" | "assistant" = "user";

  private _onSendFeedback: (feedback: string) => (evt: MouseEvent) => void =
    (feedback) => () => {
      this.dispatchEvent(
        new CustomEvent("sendfeedback", {
          detail: { feedback },
          bubbles: true,
          composed: true,
        }),
      );
    };

  render() {
    return html`
      <div class="root ${this.loading ? "loading" : ""} role-${this.role}">
        <div class="avatar">${this.role === "user" ? "👤" : "🤖"}</div>
        <div class="content">
          <slot></slot>
        </div>
        ${this.role === "assistant"
          ? html`
              <div class="feedback">
                <button
                  @click=${this._onSendFeedback("good")}
                  type="button"
                  name="good"
                  title="Good answer"
                >
                  👍
                </button>
                <button
                  @click=${this._onSendFeedback("poor")}
                  type="button"
                  name="poor"
                  title="Poor answer"
                >
                  👎
                </button>
              </div>
            `
          : null}
      </div>
    `;
  }

  static styles = css`
    :host {
      --spacing: calc(0.5 * var(--dc-spacing, 0.5rem));
      --radius: var(--dc-radius, 0.15rem);
    }
    .root {
      display: flex;
      align-items: flex-end;
      margin: var(--spacing);
      gap: var(--spacing);
      --color: var(--dc-assistant-color, #333);
      --background-color: var(--dc-assistant-background-color, #fff);
    }
    .role-user {
      flex-direction: row-reverse;
      --color: var(--dc-user-color, #fff);
      --background-color: var(--dc-user-background-color, #333);
    }
    .avatar {
      height: 1.5rem;
      width: 1.5rem;
      aspect-ratio: 1;
      border-radius: 50%;
      padding: var(--spacing);
      border: 1px solid #ccc;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .content {
      color: var(--color);
      background-color: var(--background-color);
      max-width: 80%;
      padding: 0.125rem 1rem;
      border-radius: var(--radius);
      border: 1px solid #ccc;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dc-chat-message": ChatMessageElement;
  }
  interface HTMLElementEventMap {
    sendfeedback: CustomEvent<{ feedback: string }>;
  }
}
