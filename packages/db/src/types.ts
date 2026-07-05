export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export type SavedReviewerSourceMode = "paste" | "gallery" | "camera" | "pdf";

export interface SavedReviewerSourceMetadata {
  readonly sourceMode: SavedReviewerSourceMode;
  readonly sourceCharacterCount: number;
  readonly pdfPageCount?: number;
  readonly sourceLabel?: string;
}

export interface SavedReviewerSummary {
  readonly id: string;
  readonly title: string;
  readonly sourceMetadata: SavedReviewerSourceMetadata;
  readonly sectionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavedReviewerDetail<TReviewerOutput = Json>
  extends SavedReviewerSummary {
  readonly reviewerOutput: TReviewerOutput;
}

export type ReviewerRow = Database["public"]["Tables"]["reviewers"]["Row"];
export type ReviewerInsert =
  Database["public"]["Tables"]["reviewers"]["Insert"];
export type ReviewerUpdate =
  Database["public"]["Tables"]["reviewers"]["Update"];
export type CanvasConnectionRow =
  Database["public"]["Tables"]["canvas_connections"]["Row"];
export type CanvasConnectionInsert =
  Database["public"]["Tables"]["canvas_connections"]["Insert"];
export type CanvasConnectionUpdate =
  Database["public"]["Tables"]["canvas_connections"]["Update"];
export type CanvasCapabilityRow =
  Database["public"]["Tables"]["canvas_capabilities"]["Row"];
export type CanvasCapabilityInsert =
  Database["public"]["Tables"]["canvas_capabilities"]["Insert"];
export type CanvasCapabilityUpdate =
  Database["public"]["Tables"]["canvas_capabilities"]["Update"];

export interface Database {
  public: {
    Tables: {
      canvas_capabilities: {
        Row: {
          id: string;
          user_id: string;
          canvas_connection_id: string;
          capability: string;
          status: string;
          tested_at: string | null;
          safe_error_code: string | null;
          course_id: string | null;
          integration_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_connection_id: string;
          capability: string;
          status: string;
          tested_at?: string | null;
          safe_error_code?: string | null;
          course_id?: string | null;
          integration_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_connection_id?: string;
          capability?: string;
          status?: string;
          tested_at?: string | null;
          safe_error_code?: string | null;
          course_id?: string | null;
          integration_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_capabilities_canvas_connection_id_fkey";
            columns: ["canvas_connection_id"];
            isOneToOne: false;
            referencedRelation: "canvas_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_capabilities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_connections: {
        Row: {
          id: string;
          user_id: string;
          base_url: string;
          canvas_user_id: string;
          canvas_user_name: string;
          canvas_user_email: string | null;
          token_ciphertext: string;
          token_iv: string;
          token_auth_tag: string;
          encryption_version: string;
          status: string;
          last_verified_at: string;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          base_url: string;
          canvas_user_id: string;
          canvas_user_name: string;
          canvas_user_email?: string | null;
          token_ciphertext: string;
          token_iv: string;
          token_auth_tag: string;
          encryption_version: string;
          status?: string;
          last_verified_at: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          base_url?: string;
          canvas_user_id?: string;
          canvas_user_name?: string;
          canvas_user_email?: string | null;
          token_ciphertext?: string;
          token_iv?: string;
          token_auth_tag?: string;
          encryption_version?: string;
          status?: string;
          last_verified_at?: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviewers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_metadata: Json;
          reviewer_output: Json;
          section_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_metadata?: Json;
          reviewer_output: Json;
          section_count: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_metadata?: Json;
          reviewer_output?: Json;
          section_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviewers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
