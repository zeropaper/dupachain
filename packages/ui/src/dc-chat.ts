import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ChatMessagesElement } from "./dc-chat-messages";

/**
 * Chat component
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("dc-chat")
export class ChatElement extends LitElement {
  @property({ type: String })
  mode = "minimized";

  @property({ type: String })
  buttonLabel = "Chat";

  @property({ type: String })
  sendLabel = "Send";

  @property({ type: Boolean })
  loading = false;

  @query("dialog")
  dialog!: HTMLDialogElement;

  @query(".disclaimer")
  disclaimer!: HTMLDivElement;

  @query("dc-chat-messages")
  main!: ChatMessagesElement;

  @query("textarea")
  textarea!: HTMLTextAreaElement;

  @query("footer button")
  sendButton!: HTMLButtonElement;

  setMessages(messages: Parameters<ChatMessagesElement["setMessages"]>[0]) {
    if (!this.main || !(this.main instanceof ChatMessagesElement)) {
      requestAnimationFrame(() => {
        this.setMessages(messages);
      });
      return;
    }
    this.main.setMessages(messages);
  }

  clearInput(focus = true) {
    this.textarea.value = "";
    if (focus) {
      this.textarea.focus();
    }
  }

  render() {
    return html`
      <button @click=${this._onOpen} part="button">${this.buttonLabel}</button>
      <dialog>
        <header>
          <button @click=${this._onClose}>Close</button>
        </header>
        <dc-chat-messages></dc-chat-messages>
        <footer>
          <div class="disclaimer">
            <slot></slot>
          </div>
          <div class="input">
            <textarea></textarea>
            <button @click=${this._onSend}>${this.sendLabel}</button>
          </div>
        </footer>
      </dialog>
    `;
  }

  private _onOpen() {
    this.mode = "maximized";
    this.dialog.showModal();
    this.dispatchEvent(
      new CustomEvent("open", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  openChat() {
    this._onOpen();
  }

  private _onClose() {
    this.mode = "minimized";
    this.dialog.close();
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onSend() {
    this.disclaimer.style.display = "none";
    this.dispatchEvent(
      new CustomEvent("send", {
        detail: { content: this.textarea.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      --spacing: calc(0.5 * var(--dc-spacing, 0.5rem));
      --radius: var(--dc-radius, 0.15rem);
    }
    dialog {
      padding: 0;
      border: 1px solid black;
      border-radius: var(--radius);
      flex-direction: column;
      min-width: max(65%, 300px);
      min-height: max(65%, 300px);
    }
    dialog[open] {
      display: flex;
    }
    header {
      display: flex;
      justify-content: flex-end;
      padding: calc(0.5 * var(--dc-spacing, 0.5rem));
      border-bottom: 1px solid black;
    }
    dc-chat-messages {
      flex-grow: 1;
      overflow-y: auto;
    }
    .messages {
      min-height: 120px;
      list-style: none;
      margin: 0;
      padding: calc(0.5 * var(--dc-spacing, 0.5rem));
    }
    footer {
      border-top: 1px solid black;
    }
    .disclaimer {
      padding: calc(0.5 * var(--dc-spacing, 0.5rem));
      font-size: 0.8em;
      text-align: center;
    }
    .input {
      display: flex;
      padding: calc(0.5 * var(--dc-spacing, 0.5rem));
      gap: calc(0.5 * var(--dc-spacing, 0.5rem));
    }
    .input textarea {
      flex-grow: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dc-chat": ChatElement;
  }
  interface HTMLElementEventMap {
    open: CustomEvent;
    close: CustomEvent;
    send: CustomEvent<{ content: string }>;
  }
}
