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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      basket_items: {
        Row: {
          basket_id: string
          created_at: string | null
          expires_at: string
          id: string
          listing_id: string
          price_at_add: number
          reserved_at: string | null
        }
        Insert: {
          basket_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          listing_id: string
          price_at_add: number
          reserved_at?: string | null
        }
        Update: {
          basket_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          listing_id?: string
          price_at_add?: number
          reserved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "basket_items_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      baskets: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_archived_at: string | null
          buyer_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          listing_id: string | null
          order_id: string | null
          seller_archived_at: string | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          buyer_archived_at?: string | null
          buyer_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          order_id?: string | null
          seller_archived_at?: string | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          buyer_archived_at?: string | null
          buyer_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          order_id?: string | null
          seller_archived_at?: string | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      external_pricing_cache: {
        Row: {
          bgg_game_id: number
          cached_at: string
          created_at: string | null
          expires_at: string
          id: string
          lowest_price: number | null
          lowest_price_url: string | null
          offer_count: number | null
          raw_response: Json
        }
        Insert: {
          bgg_game_id: number
          cached_at?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          lowest_price?: number | null
          lowest_price_url?: string | null
          offer_count?: number | null
          raw_response: Json
        }
        Update: {
          bgg_game_id?: number
          cached_at?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          lowest_price?: number | null
          lowest_price_url?: string | null
          offer_count?: number | null
          raw_response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "external_pricing_cache_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_pricing_cache_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: true
            referencedRelation: "stats_game_pricing"
            referencedColumns: ["bgg_game_id"]
          },
        ]
      }
      games: {
        Row: {
          alternate_names: Json | null
          bayesaverage: number | null
          created_at: string | null
          description: string | null
          designers: Json | null
          id: number
          image: string | null
          is_expansion: boolean | null
          metadata_fetched_at: string | null
          min_age: number | null
          name: string
          player_count: string | null
          playing_time: string | null
          thumbnail: string | null
          updated_at: string | null
          versions: Json | null
          yearpublished: number | null
        }
        Insert: {
          alternate_names?: Json | null
          bayesaverage?: number | null
          created_at?: string | null
          description?: string | null
          designers?: Json | null
          id: number
          image?: string | null
          is_expansion?: boolean | null
          metadata_fetched_at?: string | null
          min_age?: number | null
          name: string
          player_count?: string | null
          playing_time?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          versions?: Json | null
          yearpublished?: number | null
        }
        Update: {
          alternate_names?: Json | null
          bayesaverage?: number | null
          created_at?: string | null
          description?: string | null
          designers?: Json | null
          id?: number
          image?: string | null
          is_expansion?: boolean | null
          metadata_fetched_at?: string | null
          min_age?: number | null
          name?: string
          player_count?: string | null
          playing_time?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          versions?: Json | null
          yearpublished?: number | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          all_components_present: boolean | null
          bgg_game_id: number
          bgg_version_id: number | null
          condition: string
          condition_notes: string | null
          created_at: string | null
          edition_year: number | null
          game_name: string
          game_year: number | null
          id: string
          included_expansions: Json | null
          language: string | null
          missing_components: string | null
          photo_urls: string[]
          previous_price: number | null
          price: number
          publisher: string | null
          removed_at: string | null
          reserved_by: string | null
          reserved_until: string | null
          seller_country: string | null
          seller_id: string
          shipping_local_pickup: boolean | null
          shipping_notes: string | null
          shipping_parcel_locker: boolean | null
          sold_at: string | null
          status: string
          updated_at: string | null
          version_name: string | null
          version_source: string
        }
        Insert: {
          all_components_present?: boolean | null
          bgg_game_id: number
          bgg_version_id?: number | null
          condition: string
          condition_notes?: string | null
          created_at?: string | null
          edition_year?: number | null
          game_name: string
          game_year?: number | null
          id?: string
          included_expansions?: Json | null
          language?: string | null
          missing_components?: string | null
          photo_urls?: string[]
          previous_price?: number | null
          price: number
          publisher?: string | null
          removed_at?: string | null
          reserved_by?: string | null
          reserved_until?: string | null
          seller_country?: string | null
          seller_id: string
          shipping_local_pickup?: boolean | null
          shipping_notes?: string | null
          shipping_parcel_locker?: boolean | null
          sold_at?: string | null
          status?: string
          updated_at?: string | null
          version_name?: string | null
          version_source: string
        }
        Update: {
          all_components_present?: boolean | null
          bgg_game_id?: number
          bgg_version_id?: number | null
          condition?: string
          condition_notes?: string | null
          created_at?: string | null
          edition_year?: number | null
          game_name?: string
          game_year?: number | null
          id?: string
          included_expansions?: Json | null
          language?: string | null
          missing_components?: string | null
          photo_urls?: string[]
          previous_price?: number | null
          price?: number
          publisher?: string | null
          removed_at?: string | null
          reserved_by?: string | null
          reserved_until?: string | null
          seller_country?: string | null
          seller_id?: string
          shipping_local_pickup?: boolean | null
          shipping_notes?: string | null
          shipping_parcel_locker?: boolean | null
          sold_at?: string | null
          status?: string
          updated_at?: string | null
          version_name?: string | null
          version_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "stats_game_pricing"
            referencedColumns: ["bgg_game_id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      login_activity: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_read_status: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          last_read_message_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_status_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_system_message: boolean | null
          photo_urls: string[] | null
          sender_id: string
          system_message_type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_system_message?: boolean | null
          photo_urls?: string[] | null
          sender_id: string
          system_message_type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_system_message?: boolean | null
          photo_urls?: string[] | null
          sender_id?: string
          system_message_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      order_issues: {
        Row: {
          created_at: string | null
          description: string
          id: string
          issue_type: string
          order_id: string
          photo_urls: string[] | null
          reporter_id: string
          reporter_role: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          issue_type: string
          order_id: string
          photo_urls?: string[] | null
          reporter_id: string
          reporter_role: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          issue_type?: string
          order_id?: string
          photo_urls?: string[] | null
          reporter_id?: string
          reporter_role?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bgg_game_id: number
          condition: string
          created_at: string | null
          game_name: string
          id: string
          listing_id: string
          order_id: string
          photo_url: string | null
          price: number
        }
        Insert: {
          bgg_game_id: number
          condition: string
          created_at?: string | null
          game_name: string
          id?: string
          listing_id: string
          order_id: string
          photo_url?: string | null
          price: number
        }
        Update: {
          bgg_game_id?: number
          condition?: string
          created_at?: string | null
          game_name?: string
          id?: string
          listing_id?: string
          order_id?: string
          photo_url?: string | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          barcode: string | null
          buyer_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          destination_country: string | null
          destination_terminal_address: string | null
          destination_terminal_id: string | null
          destination_terminal_name: string | null
          id: string
          items_total: number
          label_generated_at: string | null
          label_url: string | null
          order_number: string
          paid_at: string | null
          parcel_size: string | null
          payout_status: string | null
          pickup_city: string | null
          pickup_notes: string | null
          receiver_email: string | null
          receiver_name: string | null
          receiver_phone: string | null
          refund_amount: number | null
          refunded_at: string | null
          seller_decline_reason: string | null
          seller_id: string
          seller_responded_at: string | null
          seller_response_deadline: string | null
          sender_country: string | null
          service_fee: number
          shipping_cost: number
          shipping_method: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_transfer_amount: number | null
          stripe_transfer_id: string | null
          total_amount: number
          tracking_url: string | null
          transferred_to_seller_at: string | null
          unisend_parcel_id: number | null
          unisend_request_id: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          buyer_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          destination_country?: string | null
          destination_terminal_address?: string | null
          destination_terminal_id?: string | null
          destination_terminal_name?: string | null
          id?: string
          items_total: number
          label_generated_at?: string | null
          label_url?: string | null
          order_number: string
          paid_at?: string | null
          parcel_size?: string | null
          payout_status?: string | null
          pickup_city?: string | null
          pickup_notes?: string | null
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_decline_reason?: string | null
          seller_id: string
          seller_responded_at?: string | null
          seller_response_deadline?: string | null
          sender_country?: string | null
          service_fee?: number
          shipping_cost?: number
          shipping_method: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_amount?: number | null
          stripe_transfer_id?: string | null
          total_amount: number
          tracking_url?: string | null
          transferred_to_seller_at?: string | null
          unisend_parcel_id?: number | null
          unisend_request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          buyer_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          destination_country?: string | null
          destination_terminal_address?: string | null
          destination_terminal_id?: string | null
          destination_terminal_name?: string | null
          id?: string
          items_total?: number
          label_generated_at?: string | null
          label_url?: string | null
          order_number?: string
          paid_at?: string | null
          parcel_size?: string | null
          payout_status?: string | null
          pickup_city?: string | null
          pickup_notes?: string | null
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_decline_reason?: string | null
          seller_id?: string
          seller_responded_at?: string | null
          seller_response_deadline?: string | null
          sender_country?: string | null
          service_fee?: number
          shipping_cost?: number
          shipping_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_transfer_amount?: number | null
          stripe_transfer_id?: string | null
          total_amount?: number
          tracking_url?: string | null
          transferred_to_seller_at?: string | null
          unisend_parcel_id?: number | null
          unisend_request_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payout_transactions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          gross_amount: number
          id: string
          net_amount: number
          order_id: string
          platform_fee: number
          retry_count: number | null
          seller_id: string
          status: string
          stripe_connect_account_id: string
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          order_id: string
          platform_fee: number
          retry_count?: number | null
          seller_id: string
          status?: string
          stripe_connect_account_id: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id?: string
          platform_fee?: number
          retry_count?: number | null
          seller_id?: string
          status?: string
          stripe_connect_account_id?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          arrival_date: string | null
          bank_account_last4: string | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          initiated_at: string | null
          paid_at: string | null
          status: string
          stripe_connect_account_id: string
          stripe_payout_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          arrival_date?: string | null
          bank_account_last4?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          initiated_at?: string | null
          paid_at?: string | null
          status?: string
          stripe_connect_account_id: string
          stripe_payout_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          arrival_date?: string | null
          bank_account_last4?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          initiated_at?: string | null
          paid_at?: string | null
          status?: string
          stripe_connect_account_id?: string
          stripe_payout_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          average_rating: number | null
          bank_account_bank_name: string | null
          bank_account_last4: string | null
          created_at: string | null
          dac7_annual_sales_total: number | null
          dac7_annual_transaction_count: number | null
          dac7_reporting_year: number | null
          dac7_tax_id: string | null
          dac7_tax_id_type: string | null
          has_bank_account: boolean | null
          member_since: string | null
          positive_rating_percent: number | null
          seller_status: string
          seller_terms_accepted_at: string | null
          seller_terms_version: string | null
          stripe_capabilities: Json | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_details_submitted: boolean | null
          stripe_connect_onboarding_completed: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_connect_updated_at: string | null
          stripe_requirements: Json | null
          total_completed_sales: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          bank_account_bank_name?: string | null
          bank_account_last4?: string | null
          created_at?: string | null
          dac7_annual_sales_total?: number | null
          dac7_annual_transaction_count?: number | null
          dac7_reporting_year?: number | null
          dac7_tax_id?: string | null
          dac7_tax_id_type?: string | null
          has_bank_account?: boolean | null
          member_since?: string | null
          positive_rating_percent?: number | null
          seller_status?: string
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          stripe_capabilities?: Json | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_updated_at?: string | null
          stripe_requirements?: Json | null
          total_completed_sales?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_rating?: number | null
          bank_account_bank_name?: string | null
          bank_account_last4?: string | null
          created_at?: string | null
          dac7_annual_sales_total?: number | null
          dac7_annual_transaction_count?: number | null
          dac7_reporting_year?: number | null
          dac7_tax_id?: string | null
          dac7_tax_id_type?: string | null
          has_bank_account?: boolean | null
          member_since?: string | null
          positive_rating_percent?: number | null
          seller_status?: string
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          stripe_capabilities?: Json | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_updated_at?: string | null
          stripe_requirements?: Json | null
          total_completed_sales?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          order_id: string
          rating: number
          review_text: string | null
          seller_id: string
          seller_responded_at: string | null
          seller_response: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          order_id: string
          rating: number
          review_text?: string | null
          seller_id: string
          seller_responded_at?: string | null
          seller_response?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          rating?: number
          review_text?: string | null
          seller_id?: string
          seller_responded_at?: string | null
          seller_response?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_timestamp: string
          event_type: string
          id: string
          location: string | null
          order_id: string
          state_text: string | null
          state_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_timestamp: string
          event_type: string
          id?: string
          location?: string | null
          order_id: string
          state_text?: string | null
          state_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          location?: string | null
          order_id?: string
          state_text?: string | null
          state_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          auth_providers: string[] | null
          avatar_url: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          deletion_reason: string | null
          email: string
          full_name: string
          id: string
          is_staff: boolean
          last_onboarding_email_at: string | null
          onboarding_email_step: number | null
          original_email: string | null
          phone: string | null
          profile_banner_dismissed_until: string | null
          recovery_deadline: string | null
          seller_terms_accepted_at: string | null
          seller_terms_version: string | null
          updated_at: string
        }
        Insert: {
          auth_providers?: string[] | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email: string
          full_name: string
          id: string
          is_staff?: boolean
          last_onboarding_email_at?: string | null
          onboarding_email_step?: number | null
          original_email?: string | null
          phone?: string | null
          profile_banner_dismissed_until?: string | null
          recovery_deadline?: string | null
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          updated_at?: string
        }
        Update: {
          auth_providers?: string[] | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          is_staff?: boolean
          last_onboarding_email_at?: string | null
          onboarding_email_step?: number | null
          original_email?: string | null
          phone?: string | null
          profile_banner_dismissed_until?: string | null
          recovery_deadline?: string | null
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wanted_listing_responses: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_quick_response: boolean | null
          offered_condition: string
          offered_price: number
          responded_at: string
          response_notes: string | null
          seller_id: string
          updated_at: string | null
          wanted_listing_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_quick_response?: boolean | null
          offered_condition: string
          offered_price: number
          responded_at?: string
          response_notes?: string | null
          seller_id: string
          updated_at?: string | null
          wanted_listing_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_quick_response?: boolean | null
          offered_condition?: string
          offered_price?: number
          responded_at?: string
          response_notes?: string | null
          seller_id?: string
          updated_at?: string | null
          wanted_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_listing_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listing_responses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listing_responses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listing_responses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listing_responses_wanted_listing_id_fkey"
            columns: ["wanted_listing_id"]
            isOneToOne: false
            referencedRelation: "wanted_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_listings: {
        Row: {
          acceptable_conditions: string[]
          bgg_game_id: number
          bgg_version_id: number | null
          buyer_id: string
          created_at: string | null
          currency: string
          edition_year: number | null
          expires_at: string
          game_name: string
          game_year: number | null
          id: string
          language: string | null
          location_preferences: string | null
          max_price: number
          min_price: number | null
          notes: string | null
          preferred_language: string | null
          publisher: string | null
          response_count: number
          status: string
          updated_at: string | null
          version_image: string | null
          version_name: string | null
          version_source: string | null
          version_thumbnail: string | null
        }
        Insert: {
          acceptable_conditions?: string[]
          bgg_game_id: number
          bgg_version_id?: number | null
          buyer_id: string
          created_at?: string | null
          currency?: string
          edition_year?: number | null
          expires_at?: string
          game_name: string
          game_year?: number | null
          id?: string
          language?: string | null
          location_preferences?: string | null
          max_price: number
          min_price?: number | null
          notes?: string | null
          preferred_language?: string | null
          publisher?: string | null
          response_count?: number
          status?: string
          updated_at?: string | null
          version_image?: string | null
          version_name?: string | null
          version_source?: string | null
          version_thumbnail?: string | null
        }
        Update: {
          acceptable_conditions?: string[]
          bgg_game_id?: number
          bgg_version_id?: number | null
          buyer_id?: string
          created_at?: string | null
          currency?: string
          edition_year?: number | null
          expires_at?: string
          game_name?: string
          game_year?: number | null
          id?: string
          language?: string | null
          location_preferences?: string | null
          max_price?: number
          min_price?: number | null
          notes?: string | null
          preferred_language?: string | null
          publisher?: string | null
          response_count?: number
          status?: string
          updated_at?: string | null
          version_image?: string | null
          version_name?: string | null
          version_source?: string | null
          version_thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wanted_listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "stats_game_pricing"
            referencedColumns: ["bgg_game_id"]
          },
          {
            foreignKeyName: "wanted_listings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_listings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listings_with_details: {
        Row: {
          all_components_present: boolean | null
          bgg_game_id: number | null
          bgg_version_id: number | null
          condition: string | null
          condition_notes: string | null
          created_at: string | null
          edition_year: number | null
          game_image: string | null
          game_is_expansion: boolean | null
          game_min_age: number | null
          game_name: string | null
          game_player_count: string | null
          game_playing_time: string | null
          game_thumbnail: string | null
          game_versions: Json | null
          game_year: number | null
          id: string | null
          included_expansions: Json | null
          language: string | null
          missing_components: string | null
          photo_urls: string[] | null
          price: number | null
          publisher: string | null
          reserved_by: string | null
          reserved_until: string | null
          seller_avatar_url: string | null
          seller_average_rating: number | null
          seller_badge_tier: string | null
          seller_country: string | null
          seller_id: string | null
          seller_member_since: string | null
          seller_name: string | null
          seller_positive_rating_percent: number | null
          seller_total_completed_sales: number | null
          seller_total_reviews: number | null
          shipping_local_pickup: boolean | null
          shipping_notes: string | null
          shipping_parcel_locker: boolean | null
          status: string | null
          updated_at: string | null
          version_name: string | null
          version_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_bgg_game_id_fkey"
            columns: ["bgg_game_id"]
            isOneToOne: false
            referencedRelation: "stats_game_pricing"
            referencedColumns: ["bgg_game_id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      public_seller_profiles: {
        Row: {
          average_rating: number | null
          badge_tier: string | null
          created_at: string | null
          member_since: string | null
          positive_rating_percent: number | null
          seller_status: string | null
          total_completed_sales: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          average_rating?: number | null
          badge_tier?: never
          created_at?: string | null
          member_since?: string | null
          positive_rating_percent?: number | null
          seller_status?: string | null
          total_completed_sales?: number | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          average_rating?: number | null
          badge_tier?: never
          created_at?: string | null
          member_since?: string | null
          positive_rating_percent?: number | null
          seller_status?: string | null
          total_completed_sales?: number | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles_full"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_earnings_summary: {
        Row: {
          completed_payouts_count: number | null
          earnings_last_30_days: number | null
          pending_payouts_count: number | null
          sales_last_30_days: number | null
          total_gross: number | null
          total_net: number | null
          total_platform_fees: number | null
          total_sales_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      seller_reviews_with_buyer: {
        Row: {
          buyer_avatar: string | null
          buyer_country: string | null
          buyer_id: string | null
          buyer_name: string | null
          created_at: string | null
          game_name: string | null
          id: string | null
          order_id: string | null
          order_number: string | null
          rating: number | null
          review_text: string | null
          seller_id: string | null
          seller_responded_at: string | null
          seller_response: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_transaction_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          gross_amount: number | null
          id: string | null
          net_amount: number | null
          payout_status: string | null
          platform_fee: number | null
          reference: string | null
          status: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
      stats_game_pricing: {
        Row: {
          active_listing_count: number | null
          avg_active_price: number | null
          avg_sold_price: number | null
          bgg_game_id: number | null
          completed_sales_count: number | null
          lowest_active_price: number | null
          max_sold_price: number | null
          median_sold_price: number | null
          min_sold_price: number | null
          refreshed_at: string | null
        }
        Relationships: []
      }
      user_profiles_full: {
        Row: {
          avatar_url: string | null
          bank_account_bank_name: string | null
          bank_account_last4: string | null
          country: string | null
          created_at: string | null
          dac7_annual_sales_total: number | null
          dac7_annual_transaction_count: number | null
          dac7_reporting_year: number | null
          dac7_tax_id: string | null
          dac7_tax_id_type: string | null
          deleted_at: string | null
          deletion_reason: string | null
          email: string | null
          full_name: string | null
          has_bank_account: boolean | null
          id: string | null
          is_staff: boolean | null
          original_email: string | null
          phone: string | null
          recovery_deadline: string | null
          seller_status: string | null
          seller_terms_accepted_at: string | null
          seller_terms_version: string | null
          stripe_capabilities: Json | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_details_submitted: boolean | null
          stripe_connect_onboarding_completed: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_connect_updated_at: string | null
          stripe_requirements: Json | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_cart: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: Json
      }
      add_tracking_event: {
        Args: {
          p_description: string
          p_event_timestamp: string
          p_event_type: string
          p_location: string
          p_order_id: string
          p_state_text: string
          p_state_type: string
        }
        Returns: boolean
      }
      call_edge_function: { Args: { function_name: string }; Returns: number }
      can_buyer_review_order: {
        Args: { p_buyer_id: string; p_order_id: string }
        Returns: Json
      }
      can_respond_to_wanted_listing: {
        Args: { p_seller_id: string; p_wanted_listing_id: string }
        Returns: boolean
      }
      cleanup_expired_cart_items: { Args: never; Returns: number }
      cleanup_old_login_activity: { Args: never; Returns: undefined }
      complete_delivered_orders: { Args: never; Returns: number }
      create_order_from_basket: {
        Args: {
          p_basket_id: string
          p_destination_country?: string
          p_destination_terminal_address?: string
          p_destination_terminal_id?: string
          p_destination_terminal_name?: string
          p_pickup_city?: string
          p_pickup_notes?: string
          p_receiver_email?: string
          p_receiver_name?: string
          p_receiver_phone?: string
          p_service_fee?: number
          p_shipping_cost?: number
          p_shipping_method: string
          p_stripe_payment_intent_id?: string
        }
        Returns: Json
      }
      expire_wanted_listings: { Args: never; Returns: number }
      generate_order_number: { Args: never; Returns: string }
      get_cart: { Args: { p_buyer_id: string }; Returns: Json }
      get_or_create_transaction_conversation: {
        Args: { p_order_id: string }
        Returns: string
      }
      get_order_tracking: { Args: { p_order_id: string }; Returns: Json }
      get_pending_payouts: {
        Args: { p_seller_id: string }
        Returns: {
          completed_at: string
          gross_amount: number
          net_amount: number
          order_id: string
          order_number: string
          platform_fee: number
        }[]
      }
      get_seller_onboarding_status: {
        Args: { p_seller_id: string }
        Returns: {
          can_list_items: boolean
          needs_dac7_info: boolean
          onboarding_completed: boolean
          seller_status: string
          stripe_connected: boolean
          terms_accepted: boolean
        }[]
      }
      get_seller_payout_stats: {
        Args: { p_seller_id: string }
        Returns: {
          last_payout_date: string
          payout_count: number
          pending_payout_amount: number
          total_withdrawn: number
        }[]
      }
      get_seller_trust_summary: { Args: { p_seller_id: string }; Returns: Json }
      get_unread_message_count: {
        Args: { user_uuid: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      handle_expired_seller_deadlines: { Args: never; Returns: Json }
      is_listing_available: { Args: { listing_id: string }; Returns: boolean }
      is_quick_response: {
        Args: { p_response_time?: string; p_wanted_listing_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_user_blocked: {
        Args: { user1_uuid: string; user2_uuid: string }
        Returns: boolean
      }
      post_transaction_system_message: {
        Args: { p_content: string; p_message_type: string; p_order_id: string }
        Returns: string
      }
      refresh_game_pricing_stats: { Args: never; Returns: undefined }
      release_expired_reservations: { Args: never; Returns: number }
      release_listing_reservation: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: boolean
      }
      remove_from_cart: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: Json
      }
      report_order_issue: {
        Args: {
          p_description: string
          p_issue_type: string
          p_order_id: string
          p_photo_urls?: string[]
          p_reporter_id: string
        }
        Returns: Json
      }
      reserve_listing: {
        Args: {
          p_buyer_id: string
          p_duration_minutes?: number
          p_listing_id: string
        }
        Returns: boolean
      }
      riga_now: { Args: never; Returns: string }
      seller_accept_order: {
        Args: {
          p_order_id: string
          p_parcel_size?: string
          p_seller_id: string
        }
        Returns: Json
      }
      seller_can_receive_payouts: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      seller_decline_order: {
        Args: { p_order_id: string; p_reason?: string; p_seller_id: string }
        Returns: Json
      }
      seller_onboarding_completed: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      seller_requires_dac7_reporting: {
        Args: { p_seller_id: string }
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
    Enums: {},
  },
} as const
