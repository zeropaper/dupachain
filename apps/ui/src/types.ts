export interface ChatMessageInfo {
  role: "assistant" | "user";
  content: string;
  id: string;
  created_at: string;
}
