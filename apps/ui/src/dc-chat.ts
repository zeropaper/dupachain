import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { ChatMessageInfo } from "./types";

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

  @query("main>ul")
  messages!: HTMLUListElement;

  @query("textarea")
  textarea!: HTMLTextAreaElement;

  @query("footer button")
  sendButton!: HTMLButtonElement;

  @state()
  private _messages: ChatMessageInfo[] = [];

  clearInput() {
    this.textarea.value = "";
  }

  setMessages(messages: ChatMessageInfo[]) {
    this._messages = messages;
    this.renderMessages();
  }

  renderMessages() {
    const ul = this.messages;
    ul.innerHTML = "";
    ul.append(
      ...this._messages.map((message) => {
        const li = document.createElement("li");
        li.classList.add(message.role === "assistant" ? "assistant" : "user");
        li.innerHTML = `
            <div class="avatar">${
              message.role === "assistant" ? "AI" : "you"
            }</div>
            <div class="content">${message.content}</div>
          `;
        return li;
      }),
    );
  }

  render() {
    return html`
      <button @click=${this._onOpen} part="button">${this.buttonLabel}</button>
      <dialog>
        <header>
          <button @click=${this._onClose}>Close</button>
        </header>
        <main>
          <ul></ul>
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
    }
    dialog {
      padding: 0;
      border: 1px solid black;
      border-radius: 0.35rem;
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
      padding: 0.35rem;
      border-bottom: 1px solid black;
    }
    main {
      flex-grow: 1;
      overflow-y: auto;
    }
    main > ul {
      min-height: 120px;
      list-style: none;
      margin: 0;
      padding: 0.35rem;
    }
    li {
      margin: 0.35rem;
      display: flex;
      align-items: flex-end;
      gap: 0.35rem;
    }
    li.user {
      flex-direction: row-reverse;
    }
    li .avatar {
      height: 1.5rem;
      width: 1.5rem;
      aspect-ratio: 1;
      border-radius: 50%;
      padding: 0.35rem;
      border: 1px solid #ccc;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    li .content {
      max-width: 80%;
      padding: 0.65rem 1rem;
      border-radius: 0.35rem;
      border: 1px solid #ccc;
    }
    footer {
      border-top: 1px solid black;
    }
    .disclaimer {
      padding: 0.35rem;
      font-size: 0.8em;
      text-align: center;
    }
    .input {
      display: flex;
      padding: 0.35rem;
      gap: 0.35rem;
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
