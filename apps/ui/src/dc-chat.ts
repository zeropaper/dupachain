import { LitElement, css, html } from "lit";
import { marked } from "marked";
import { customElement, property, query } from "lit/decorators.js";
import { ChatMessageInfo } from "./types";
import { ChatMessageElement } from "./dc-chat-message";

/**
 * Chat component
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("dc-chat")
export class ChatElement extends LitElement {
  /**
   * Mode in which the component is.
   */
  @property({ type: String })
  mode = "minimized";

  @property({ type: String })
  chatId = "";

  @property({ type: String })
  buttonLabel = "Chat";

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  loading = false;

  @query("dialog")
  dialog!: HTMLDialogElement;

  @query(".disclaimer")
  disclaimer!: HTMLDivElement;

  @query("main")
  main!: HTMLDivElement;

  @query("main>.messages")
  messages!: HTMLDivElement;

  @query("textarea")
  textarea!: HTMLTextAreaElement;

  @query("footer button")
  sendButton!: HTMLButtonElement;

  @query(".messages > dc-chat-message")
  messageElements!: ChatMessageElement[];

  clearInput(focus = true) {
    this.textarea.value = "";
    if (focus) {
      this.textarea.focus();
    }
  }

  protected messageElementPresent(message: ChatMessageInfo) {
    return Array.from(this.messageElements).find(
      (messageElement) => messageElement.getAttribute("data-id") === message.id,
    );
  }

  setMessages(messages: ChatMessageInfo[]) {
    const presentIds: string[] = [];
    const currentMessageEls = this.messageElements;

    (currentMessageEls || []).forEach((messageElement) => {
      const elId = messageElement.getAttribute("data-id");
      const update = messages.find((msg) => msg.id === elId);
      if (!update || this.messageElementPresent(update)) {
        messageElement.remove();
        return;
      }
      presentIds.push(update.id);
    });

    messages.forEach((message) => {
      if (presentIds.includes(message.id)) {
        return;
      }

      const el = new ChatMessageElement();
      el.setAttribute("data-id", message.id);
      el.role = message.role as any;
      const markdown = message.content;
      const html = marked.parse(markdown, { async: false });
      el.innerHTML = typeof html === "string" ? html : "";
      this.main.appendChild(el);
    });

    this.scrollDown();
  }

  scrollDown() {
    requestAnimationFrame(() => {
      this.main.scrollTop = this.main.scrollHeight;
    });
  }

  render() {
    return html`
      <button @click=${this._onOpen} part="button">${this.buttonLabel}</button>
      <dialog>
        <header>
          <button @click=${this._onClose}>Close</button>
        </header>
        <main>
          <div class="messages"></div>
        </main>
        <footer>
          <div class="disclaimer">
            <slot></slot>
          </div>
          <div class="input">
            <textarea></textarea>
            <button @click=${this._onSend}>Send</button>
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
    main {
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

  private _handleResize = () => {
    // const { innerWidth, innerHeight } = window;
    // this.dialog.style.width = `${innerWidth}px`;
    // this.dialog.style.height = `${innerHeight}px`;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this._handleResize);
  }
  disconnectedCallback() {
    window.removeEventListener("resize", this._handleResize);
    super.disconnectedCallback();
  }
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
