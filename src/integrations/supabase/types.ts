export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cultures: {
        Row: {
          created_at: string
          estimated_revenue: number
          farm_id: string
          hectares: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_revenue: number
          farm_id: string
          hectares: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_revenue?: number
          farm_id?: string
          hectares?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultures_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_logs: {
        Row: {
          created_at: string | null
          extraction_data: Json | null
          file_name: string | null
          file_size: number | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          extraction_data?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          extraction_data?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_extraction_results: {
        Row: {
          created_at: string
          extracted_data: Json
          id: string
          ocr_log_id: string
          processing_status: string
          processing_time: number | null
          run_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_data: Json
          id?: string
          ocr_log_id: string
          processing_status?: string
          processing_time?: number | null
          run_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json
          id?: string
          ocr_log_id?: string
          processing_status?: string
          processing_time?: number | null
          run_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extraction_results_ocr_log_id_fkey"
            columns: ["ocr_log_id"]
            isOneToOne: false
            referencedRelation: "document_ocr_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ocr_logs: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          ocr_content: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ocr_content?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ocr_content?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      farm_details: {
        Row: {
          created_at: string
          crop_type: string | null
          farm_id: string
          id: string
          location_data: Json | null
          market_prices: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_type?: string | null
          farm_id: string
          id?: string
          location_data?: Json | null
          market_prices?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_type?: string | null
          farm_id?: string
          id?: string
          location_data?: Json | null
          market_prices?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_details_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          document_id: string | null
          hectares: number
          id: string
          region: string | null
          total_revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          hectares: number
          id?: string
          region?: string | null
          total_revenue: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          hectares?: number
          id?: string
          region?: string | null
          total_revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          document_url: string | null
          id: string
          loan_id: string
          payment_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          document_url?: string | null
          id?: string
          loan_id: string
          payment_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          document_url?: string | null
          id?: string
          loan_id?: string
          payment_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          contract_number: string | null
          contract_signed: boolean
          created_at: string
          farm_id: string
          id: string
          interest_rate: number
          payment_frequency: string
          status: string
          term_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contract_number?: string | null
          contract_signed?: boolean
          created_at?: string
          farm_id: string
          id?: string
          interest_rate: number
          payment_frequency: string
          status?: string
          term_months: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contract_number?: string | null
          contract_signed?: boolean
          created_at?: string
          farm_id?: string
          id?: string
          interest_rate?: number
          payment_frequency?: string
          status?: string
          term_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          average_yield: number
          created_at: string
          culture: string
          id: string
          is_forecast: boolean
          last_updated: string
          price: number
          region: string
          trend: number
          year: string
        }
        Insert: {
          average_yield: number
          created_at?: string
          culture: string
          id?: string
          is_forecast?: boolean
          last_updated?: string
          price: number
          region: string
          trend?: number
          year: string
        }
        Update: {
          average_yield?: number
          created_at?: string
          culture?: string
          id?: string
          is_forecast?: boolean
          last_updated?: string
          price?: number
          region?: string
          trend?: number
          year?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          bank_account: string | null
          created_at: string
          customer_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          created_at?: string
          customer_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          created_at?: string
          customer_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_finance_officer: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
