import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ChatMessagesElement } from "@local/ui/src/dc-chat-messages";

/**
 * Chat component
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("dc-persona-run")
export class PersonaRun extends LitElement {
  @property({ type: String })
  personaName: string;

  @property({ type: Array })
  messages: Parameters<ChatMessagesElement["setMessages"]>[0];

  @query("dc-chat-messages")
  main!: ChatMessagesElement;

  constructor() {
    super();
    this.personaName = "";
    this.messages = [];
  }

  get ready() {
    return this.main instanceof ChatMessagesElement;
  }

  render() {
    requestAnimationFrame(() => {
      if (!this.ready) {
        return;
      }
      this.main.setMessages(this.messages);
    });
    return html`
      <h3>Persona: ${this.personaName}</h3>
      <div>${this.messages.length} messages</div>
      <dc-chat-messages></dc-chat-messages>
    `;
  }

  static styles = css`
    :host {
      --spacing: calc(0.5 * var(--dc-spacing, 0.5rem));
      --radius: var(--dc-radius, 0.15rem);
      display: block;
    }
    dc-chat-messages {
      overflow-y: auto;

      display: block;
      max-height: 620px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dc-persona-run": PersonaRun;
  }
  interface HTMLElementEventMap {}
}
