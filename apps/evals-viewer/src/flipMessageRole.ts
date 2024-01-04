export function flipMessageRole(message: any, index: number) {
  return {
    ...message,
    created_at: "",
    id: `${index}`,
    role: message.role === "user" ? "assistant" : "user",
  };
}
