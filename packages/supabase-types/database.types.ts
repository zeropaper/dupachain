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
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
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
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
