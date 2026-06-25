export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      content_jobs: {
        Row: {
          id: string
          topic: string
          keywords: string | null
          category: string
          target_audience: string
          language: string
          content_types: string[]
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic: string
          keywords?: string | null
          category: string
          target_audience: string
          language: string
          content_types: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topic?: string
          keywords?: string | null
          category?: string
          target_audience?: string
          language?: string
          content_types?: string[]
          status?: string
          updated_at?: string
        }
      }
      content_drafts: {
        Row: {
          id: string
          job_id: string
          content_type: string
          draft_data: Json
          is_approved: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          content_type: string
          draft_data?: Json
          is_approved?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          draft_data?: Json
          is_approved?: boolean
          status?: string
          updated_at?: string
        }
      }
      generated_content: {
        Row: {
          id: string
          job_id: string
          content_type: string
          file_url: string | null
          thumbnail_url: string | null
          output_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          content_type: string
          file_url?: string | null
          thumbnail_url?: string | null
          output_data?: Json | null
          created_at?: string
        }
        Update: {
          file_url?: string | null
          thumbnail_url?: string | null
          output_data?: Json | null
        }
      }
      social_posts: {
        Row: {
          id: string
          job_id: string
          content_type: string
          caption: string
          hashtags: string[]
          platforms: string[]
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          content_type: string
          caption: string
          hashtags?: string[]
          platforms?: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          caption?: string
          hashtags?: string[]
          platforms?: string[]
          status?: string
          updated_at?: string
        }
      }
      social_platform_logs: {
        Row: {
          id: string
          social_post_id: string
          platform: string
          status: string
          platform_post_id: string | null
          post_url: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          social_post_id: string
          platform: string
          status?: string
          platform_post_id?: string | null
          post_url?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          platform_post_id?: string | null
          post_url?: string | null
          error_message?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
