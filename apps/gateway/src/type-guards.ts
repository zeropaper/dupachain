import { ChatsRow } from "./types";

export function isChatsRow(row: any): row is ChatsRow {
  return row && row.id && row.metadata && row.metadata.systemPrompt;
}
