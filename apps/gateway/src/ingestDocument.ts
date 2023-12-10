import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getOpenAIStore } from "./tools/stores/sb-openai";
import { Json } from "./types";

export async function ingestDocument(document: {
  content: string;
  metadata:
    | ((string | number | boolean | { [key: string]: Json } | Json[]) &
        (
          | string
          | number
          | boolean
          | { [key: string]: Json }
          | Json[]
          | undefined
        ))
    | null;
  reference: string;
  format: "html" | "markdown";
}) {
  const { format, content, metadata, reference } = document;

  const splitter = RecursiveCharacterTextSplitter.fromLanguage(format, {
    chunkSize: 256,
    chunkOverlap: 20,
  });

  const splitDocuments = await splitter.createDocuments(
    [content],
    [
      {
        ...(metadata as Record<string, any>),
        format,
        reference,
      },
    ],
  );

  const store = await getOpenAIStore();
  await store.addDocuments(splitDocuments);
}
