export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          chat_id: string;
          content: string;
          created_at: string;
          finished: boolean;
          id: string;
          metadata: Json | null;
          name: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          chat_id: string;
          content: string;
          created_at?: string;
          finished?: boolean;
          id?: string;
          metadata?: Json | null;
          name?: string | null;
          role: string;
          updated_at?: string;
        };
        Update: {
          chat_id?: string;
          content?: string;
          created_at?: string;
          finished?: boolean;
          id?: string;
          metadata?: Json | null;
          name?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey";
            columns: ["chat_id"];
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
      chats: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          content: string;
          created_at: string;
          format: Database["public"]["Enums"]["document_format"];
          id: string;
          metadata: Json | null;
          reference: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          format: Database["public"]["Enums"]["document_format"];
          id?: string;
          metadata?: Json | null;
          reference: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          format?: Database["public"]["Enums"]["document_format"];
          id?: string;
          metadata?: Json | null;
          reference?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hft_embeddings: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      openai_embeddings: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_hft_embeddings: {
        Args: {
          reference: string;
        };
        Returns: undefined;
      };
      delete_openai_embeddings: {
        Args: {
          reference: string;
        };
        Returns: undefined;
      };
      match_hft_embeddings: {
        Args: {
          query_embedding: string;
          filter?: Json;
          match_count?: number;
        };
        Returns: {
          id: number;
          content: string;
          metadata: Json;
          embedding: Json;
          similarity: number;
        }[];
      };
      match_openai_embeddings: {
        Args: {
          query_embedding: string;
          filter?: Json;
          match_count?: number;
        };
        Returns: {
          id: number;
          content: string;
          metadata: Json;
          embedding: Json;
          similarity: number;
        }[];
      };
    };
    Enums: {
      document_format: "html" | "markdown";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
