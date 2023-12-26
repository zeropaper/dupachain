import { LitElement, css, html } from "lit";
import { marked } from "marked";
import { customElement, query } from "lit/decorators.js";
import { ChatMessageInfo } from "./types";
import { ChatMessageElement } from "./dc-chat-message";
import DOMPurify from "dompurify";

// customElements.define('dc-chat-message', ChatMessageElement);

/**
 * Chat component
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("dc-chat-messages")
export class ChatMessagesElement extends LitElement {
  @query("main")
  main!: HTMLDivElement;

  @query(".messages")
  messagesContainer!: HTMLDivElement;

  @query(".messages>dc-chat-message")
  messageElements!: NodeListOf<ChatMessageElement>;

  private _messages: ChatMessageInfo[] = [];

  private findMessageElement(message: ChatMessageInfo) {
    return (
      this.shadowRoot?.querySelector<ChatMessageElement>(
        `dc-chat-message[data-id="${message.id}"]`,
      ) ?? null
    );
  }

  setMessages(messages: ChatMessageInfo[]) {
    this._messages = messages;
    if (!this.messagesContainer) {
      requestAnimationFrame(() => {
        this.setMessages(this._messages);
      });
      return;
    }
    const currentMessageEls = Array.from(this.messageElements || []);

    currentMessageEls.forEach((messageElement) => {
      const elId = messageElement.getAttribute("data-id");
      const keep = this._messages.find((msg) => msg.id === elId);
      if (keep) {
        return;
      }
      messageElement.remove();
    });

    this._messages.forEach((message) => {
      let el: ChatMessageElement | null = this.findMessageElement(message);
      if (!el) {
        el = new ChatMessageElement();
        this.messagesContainer.appendChild(el);
        el.setAttribute("data-id", message.id);
        el.role = message.role as any;
      }
      const markdown = message.content;
      const html = marked.parse(markdown, { async: false }) as string;
      el.innerHTML = DOMPurify.sanitize(html);
    });

    this.scrollDown();
  }

  scrollDown() {
    requestAnimationFrame(() => {
      this.main.scrollTop = this.main.scrollHeight;
    });
  }

  render() {
    return html` <main>
      <div class="messages"></div>
    </main>`;
  }

  static styles = css`
    :host {
      --spacing: calc(0.5 * var(--dc-spacing, 0.5rem));
      --radius: var(--dc-radius, 0.15rem);
    }

    .messages {
      min-height: 120px;
      list-style: none;
      margin: 0;
      padding: calc(0.5 * var(--dc-spacing, 0.5rem));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dc-chat-messages": ChatMessagesElement;
  }
  interface HTMLElementEventMap {}
}
