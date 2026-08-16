export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_settings: {
        Row: {
          base_currency: string
          free_models_only: boolean
          human_approval_required: boolean
          id: number
          model: string
          provider: string
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_currency?: string
          free_models_only?: boolean
          human_approval_required?: boolean
          id?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_currency?: string
          free_models_only?: boolean
          human_approval_required?: boolean
          id?: number
          model?: string
          provider?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          bucket: string
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          file_size: number | null
          id: string
          invoice_id: string | null
          mime_type: string | null
          payment_id: string | null
          project_id: string | null
          purchase_order_id: string | null
          quote_id: string | null
          source_document_id: string | null
          storage_path: string
          title: string | null
        }
        Insert: {
          bucket: string
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          file_size?: number | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          payment_id?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          quote_id?: string | null
          source_document_id?: string | null
          storage_path: string
          title?: string | null
        }
        Update: {
          bucket?: string
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          file_size?: number | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          payment_id?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          quote_id?: string | null
          source_document_id?: string | null
          storage_path?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_evidence: {
        Row: {
          confidence: number
          configuration: Json
          created_at: string
          created_by: string | null
          currency: string
          customer_name: string | null
          evidence_kind: string
          frame_color: string | null
          glass: Json
          height_mm: number | null
          historical_line_amount_centavos: number | null
          historical_unit_price_centavos: number | null
          human_review_required: boolean
          id: string
          included_services: Json
          location: string | null
          pricing_type: string
          product_family: string
          project_name: string | null
          quantity: number | null
          raw: Json
          source_date: string | null
          source_document_id: string | null
          source_reference: string
          system: string | null
          updated_at: string
          width_mm: number | null
        }
        Insert: {
          confidence?: number
          configuration?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          evidence_kind?: string
          frame_color?: string | null
          glass?: Json
          height_mm?: number | null
          historical_line_amount_centavos?: number | null
          historical_unit_price_centavos?: number | null
          human_review_required?: boolean
          id?: string
          included_services?: Json
          location?: string | null
          pricing_type?: string
          product_family: string
          project_name?: string | null
          quantity?: number | null
          raw?: Json
          source_date?: string | null
          source_document_id?: string | null
          source_reference: string
          system?: string | null
          updated_at?: string
          width_mm?: number | null
        }
        Update: {
          confidence?: number
          configuration?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          evidence_kind?: string
          frame_color?: string | null
          glass?: Json
          height_mm?: number | null
          historical_line_amount_centavos?: number | null
          historical_unit_price_centavos?: number | null
          human_review_required?: boolean
          id?: string
          included_services?: Json
          location?: string | null
          pricing_type?: string
          product_family?: string
          project_name?: string | null
          quantity?: number | null
          raw?: Json
          source_date?: string | null
          source_document_id?: string | null
          source_reference?: string
          system?: string | null
          updated_at?: string
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_evidence_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_fk"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          project_address: string | null
          source_document_id: string | null
          tin: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          project_address?: string | null
          source_document_id?: string | null
          tin?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_address?: string | null
          source_document_id?: string | null
          tin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base: string
          created_at: string
          created_by: string | null
          effective_at: string
          human_approved: boolean
          id: string
          quote: string
          rate: number
          source: string
        }
        Insert: {
          base?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          human_approved?: boolean
          id?: string
          quote: string
          rate: number
          source: string
        }
        Update: {
          base?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          human_approved?: boolean
          id?: string
          quote?: string
          rate?: number
          source?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          amount_centavos: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_no: number
          quantity: number
          unit: string
          unit_price_centavos: number
        }
        Insert: {
          amount_centavos?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          line_no?: number
          quantity?: number
          unit?: string
          unit_price_centavos?: number
        }
        Update: {
          amount_centavos?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_no?: number
          quantity?: number
          unit?: string
          unit_price_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          balance_centavos: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_name: string
          due_date: string | null
          human_approved: boolean
          id: string
          invoice_date: string
          invoice_number: string | null
          invoice_type: string
          notes: string | null
          paid_centavos: number
          percentage_basis_points: number
          po_reference: string | null
          project_id: string | null
          project_name: string
          purchase_order_id: string | null
          quote_id: string | null
          status: string
          subtotal_centavos: number
          tax_centavos: number
          terms: string | null
          total_centavos: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          balance_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name?: string
          due_date?: string | null
          human_approved?: boolean
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_type?: string
          notes?: string | null
          paid_centavos?: number
          percentage_basis_points?: number
          po_reference?: string | null
          project_id?: string | null
          project_name?: string
          purchase_order_id?: string | null
          quote_id?: string | null
          status?: string
          subtotal_centavos?: number
          tax_centavos?: number
          terms?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          balance_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name?: string
          due_date?: string | null
          human_approved?: boolean
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_type?: string
          notes?: string | null
          paid_centavos?: number
          percentage_basis_points?: number
          po_reference?: string | null
          project_id?: string | null
          project_name?: string
          purchase_order_id?: string | null
          quote_id?: string | null
          status?: string
          subtotal_centavos?: number
          tax_centavos?: number
          terms?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      items_purchased: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          description: string | null
          frame_color: string | null
          glass: string | null
          height_mm: number | null
          id: string
          product_family: string
          project_id: string | null
          purchase_order_id: string | null
          purchased_on: string | null
          quantity: number
          quote_id: string | null
          source_document_id: string | null
          source_reference: string | null
          system: string | null
          unit_price_centavos: number | null
          width_mm: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          description?: string | null
          frame_color?: string | null
          glass?: string | null
          height_mm?: number | null
          id?: string
          product_family: string
          project_id?: string | null
          purchase_order_id?: string | null
          purchased_on?: string | null
          quantity?: number
          quote_id?: string | null
          source_document_id?: string | null
          source_reference?: string | null
          system?: string | null
          unit_price_centavos?: number | null
          width_mm?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          description?: string | null
          frame_color?: string | null
          glass?: string | null
          height_mm?: number | null
          id?: string
          product_family?: string
          project_id?: string | null
          purchase_order_id?: string | null
          purchased_on?: string | null
          quantity?: number
          quote_id?: string | null
          source_document_id?: string | null
          source_reference?: string | null
          system?: string | null
          unit_price_centavos?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_purchased_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_purchased_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_purchased_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_purchased_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_purchased_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          architect: string | null
          contractor: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          developer: string | null
          evidence: Json
          human_review_required: boolean
          id: string
          location: string
          next_action: string | null
          owner_name: string | null
          project: string
          project_stage: string | null
          project_type: string
          relevance: string | null
          score: number
          source_date: string | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          architect?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          developer?: string | null
          evidence?: Json
          human_review_required?: boolean
          id?: string
          location?: string
          next_action?: string | null
          owner_name?: string | null
          project: string
          project_stage?: string | null
          project_type?: string
          relevance?: string | null
          score?: number
          source_date?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          architect?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          developer?: string | null
          evidence?: Json
          human_review_required?: boolean
          id?: string
          location?: string
          next_action?: string | null
          owner_name?: string | null
          project?: string
          project_stage?: string | null
          project_type?: string
          relevance?: string | null
          score?: number
          source_date?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_centavos: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          invoice_id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          source_document_id: string | null
        }
        Insert: {
          amount_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          source_document_id?: string | null
        }
        Update: {
          amount_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          source_lead_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          source_lead_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          source_lead_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          amount_centavos: number
          created_at: string
          description: string
          id: string
          line_no: number
          purchase_order_id: string
          quantity: number
          unit: string
          unit_price_centavos: number
        }
        Insert: {
          amount_centavos?: number
          created_at?: string
          description?: string
          id?: string
          line_no?: number
          purchase_order_id: string
          quantity?: number
          unit?: string
          unit_price_centavos?: number
        }
        Update: {
          amount_centavos?: number
          created_at?: string
          description?: string
          id?: string
          line_no?: number
          purchase_order_id?: string
          quantity?: number
          unit?: string
          unit_price_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          comparison: Json
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          id: string
          po_date: string | null
          po_number: string
          project_id: string | null
          quote_id: string | null
          source_document_id: string | null
          status: string
          terms: string | null
          total_centavos: number
          updated_at: string
        }
        Insert: {
          comparison?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          id?: string
          po_date?: string | null
          po_number: string
          project_id?: string | null
          quote_id?: string | null
          source_document_id?: string | null
          status?: string
          terms?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Update: {
          comparison?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          id?: string
          po_date?: string | null
          po_number?: string
          project_id?: string | null
          quote_id?: string | null
          source_document_id?: string | null
          status?: string
          terms?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          amount_centavos: number
          created_at: string
          description: string
          evidence_ids: Json
          frame: string | null
          glass: string | null
          height_mm: number | null
          id: string
          line_no: number
          pricing_status: string
          product_family: string | null
          quantity: number
          quote_id: string
          system: string | null
          unit: string
          unit_price_centavos: number
          width_mm: number | null
        }
        Insert: {
          amount_centavos?: number
          created_at?: string
          description?: string
          evidence_ids?: Json
          frame?: string | null
          glass?: string | null
          height_mm?: number | null
          id?: string
          line_no?: number
          pricing_status?: string
          product_family?: string | null
          quantity?: number
          quote_id: string
          system?: string | null
          unit?: string
          unit_price_centavos?: number
          width_mm?: number | null
        }
        Update: {
          amount_centavos?: number
          created_at?: string
          description?: string
          evidence_ids?: Json
          frame?: string | null
          glass?: string | null
          height_mm?: number | null
          id?: string
          line_no?: number
          pricing_status?: string
          product_family?: string | null
          quantity?: number
          quote_id?: string
          system?: string | null
          unit?: string
          unit_price_centavos?: number
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          crating_centavos: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_name: string
          delivery_centavos: number
          discount_centavos: number
          id: string
          installation_centavos: number
          lead_id: string | null
          lead_time: string | null
          location: string | null
          notes: string | null
          project_id: string | null
          project_name: string
          quote_date: string
          quote_number: string | null
          shipping_centavos: number
          status: string
          subtotal_centavos: number
          tax_centavos: number
          tax_rate_basis_points: number | null
          tax_treatment: string | null
          terms: string | null
          total_centavos: number
          trucking_centavos: number
          updated_at: string
          warnings: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          crating_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name?: string
          delivery_centavos?: number
          discount_centavos?: number
          id?: string
          installation_centavos?: number
          lead_id?: string | null
          lead_time?: string | null
          location?: string | null
          notes?: string | null
          project_id?: string | null
          project_name?: string
          quote_date?: string
          quote_number?: string | null
          shipping_centavos?: number
          status?: string
          subtotal_centavos?: number
          tax_centavos?: number
          tax_rate_basis_points?: number | null
          tax_treatment?: string | null
          terms?: string | null
          total_centavos?: number
          trucking_centavos?: number
          updated_at?: string
          warnings?: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          crating_centavos?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name?: string
          delivery_centavos?: number
          discount_centavos?: number
          id?: string
          installation_centavos?: number
          lead_id?: string | null
          lead_time?: string | null
          location?: string | null
          notes?: string | null
          project_id?: string | null
          project_name?: string
          quote_date?: string
          quote_number?: string | null
          shipping_centavos?: number
          status?: string
          subtotal_centavos?: number
          tax_centavos?: number
          tax_rate_basis_points?: number | null
          tax_treatment?: string | null
          terms?: string | null
          total_centavos?: number
          trucking_centavos?: number
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          conflicts: Json
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          doc_date: string | null
          doc_type: string
          extracted: Json
          file_size: number | null
          filename: string | null
          human_review_required: boolean
          id: string
          ingestion_status: string
          location: string | null
          mime_type: string | null
          missing_information: Json
          notes: string | null
          project_id: string | null
          project_name: string | null
          reference: string | null
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          conflicts?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          doc_date?: string | null
          doc_type?: string
          extracted?: Json
          file_size?: number | null
          filename?: string | null
          human_review_required?: boolean
          id?: string
          ingestion_status?: string
          location?: string | null
          mime_type?: string | null
          missing_information?: Json
          notes?: string | null
          project_id?: string | null
          project_name?: string | null
          reference?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          conflicts?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          doc_date?: string | null
          doc_type?: string
          extracted?: Json
          file_size?: number | null
          filename?: string | null
          human_review_required?: boolean
          id?: string
          ingestion_status?: string
          location?: string | null
          mime_type?: string | null
          missing_information?: Json
          notes?: string | null
          project_id?: string | null
          project_name?: string | null
          reference?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_documents_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: string }
      next_quote_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
