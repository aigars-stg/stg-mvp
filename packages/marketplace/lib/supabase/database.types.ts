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
          metadata: Json | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string | null
          extension_minutes: number | null
          id: string
          ip_address: unknown
          is_winning: boolean | null
          listing_id: string
          triggered_extension: boolean | null
          user_agent: string | null
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string | null
          extension_minutes?: number | null
          id?: string
          ip_address?: unknown
          is_winning?: boolean | null
          listing_id: string
          triggered_extension?: boolean | null
          user_agent?: string | null
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string | null
          extension_minutes?: number | null
          id?: string
          ip_address?: unknown
          is_winning?: boolean | null
          listing_id?: string
          triggered_extension?: boolean | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_participants"
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
        ]
      }
      everypay_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          order_reference: string | null
          payload: Json | null
          payment_reference: string
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          order_reference?: string | null
          payload?: Json | null
          payment_reference: string
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          order_reference?: string | null
          payload?: Json | null
          payment_reference?: string
          processed_at?: string | null
        }
        Relationships: []
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
          parent_bgg_id: number | null
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
          parent_bgg_id?: number | null
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
          parent_bgg_id?: number | null
          player_count?: string | null
          playing_time?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          versions?: Json | null
          yearpublished?: number | null
        }
        Relationships: []
      }
      listing_questions: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          listing_id: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          listing_id: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          listing_id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "listing_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "listing_questions_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          all_components_present: boolean | null
          auction_anti_snipe_extended: boolean | null
          auction_bid_count: number | null
          auction_cooldown_hours: number | null
          auction_current_bid: number | null
          auction_duration_days: number | null
          auction_end_strategy: string | null
          auction_ends_at: string | null
          auction_payment_deadline: string | null
          auction_start_price: number | null
          auction_winner_id: string | null
          auction_winner_notified_at: string | null
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
          listing_type: string
          missing_components: string | null
          photo_urls: string[]
          previous_price: number | null
          price: number
          pricing_format: string
          publisher: string | null
          removed_at: string | null
          reserved_by: string | null
          reserved_until: string | null
          seller_id: string
          shipping_local_pickup: boolean | null
          shipping_notes: string | null
          shipping_parcel_locker: boolean | null
          sold_at: string | null
          source_wanted_listing_id: string | null
          status: string
          transaction_method: string
          updated_at: string | null
          version_name: string | null
          version_source: string
        }
        Insert: {
          all_components_present?: boolean | null
          auction_anti_snipe_extended?: boolean | null
          auction_bid_count?: number | null
          auction_cooldown_hours?: number | null
          auction_current_bid?: number | null
          auction_duration_days?: number | null
          auction_end_strategy?: string | null
          auction_ends_at?: string | null
          auction_payment_deadline?: string | null
          auction_start_price?: number | null
          auction_winner_id?: string | null
          auction_winner_notified_at?: string | null
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
          listing_type?: string
          missing_components?: string | null
          photo_urls?: string[]
          previous_price?: number | null
          price: number
          pricing_format?: string
          publisher?: string | null
          removed_at?: string | null
          reserved_by?: string | null
          reserved_until?: string | null
          seller_id: string
          shipping_local_pickup?: boolean | null
          shipping_notes?: string | null
          shipping_parcel_locker?: boolean | null
          sold_at?: string | null
          source_wanted_listing_id?: string | null
          status?: string
          transaction_method?: string
          updated_at?: string | null
          version_name?: string | null
          version_source: string
        }
        Update: {
          all_components_present?: boolean | null
          auction_anti_snipe_extended?: boolean | null
          auction_bid_count?: number | null
          auction_cooldown_hours?: number | null
          auction_current_bid?: number | null
          auction_duration_days?: number | null
          auction_end_strategy?: string | null
          auction_ends_at?: string | null
          auction_payment_deadline?: string | null
          auction_start_price?: number | null
          auction_winner_id?: string | null
          auction_winner_notified_at?: string | null
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
          listing_type?: string
          missing_components?: string | null
          photo_urls?: string[]
          previous_price?: number | null
          price?: number
          pricing_format?: string
          publisher?: string | null
          removed_at?: string | null
          reserved_by?: string | null
          reserved_until?: string | null
          seller_id?: string
          shipping_local_pickup?: boolean | null
          shipping_notes?: string | null
          shipping_parcel_locker?: boolean | null
          sold_at?: string | null
          source_wanted_listing_id?: string | null
          status?: string
          transaction_method?: string
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
            foreignKeyName: "listings_source_wanted_listing_id_fkey"
            columns: ["source_wanted_listing_id"]
            isOneToOne: false
            referencedRelation: "wanted_listings"
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
          sender_id: string | null
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
          sender_id?: string | null
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
          sender_id?: string | null
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
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string | null
          source: string | null
          subscribed_at: string
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "order_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_participants"
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
          game_thumbnail: string | null
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
          game_thumbnail?: string | null
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
          game_thumbnail?: string | null
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
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          barcode: string | null
          buyer_id: string
          buyer_wallet_debit_cents: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_net_cents: number | null
          commission_vat_cents: number | null
          commission_vat_rate: number | null
          created_at: string | null
          delivered_at: string | null
          destination_country: string | null
          destination_terminal_address: string | null
          destination_terminal_id: string | null
          destination_terminal_name: string | null
          dispute_description: string | null
          dispute_photo_urls: string[] | null
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolution_note: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          dispute_seller_deadline: string | null
          dispute_seller_responded_at: string | null
          dispute_seller_response: string | null
          dispute_status: string | null
          disputed_at: string | null
          everypay_payment_reference: string | null
          everypay_payment_state: string | null
          id: string
          items_total: number
          label_error: string | null
          label_generated_at: string | null
          label_url: string | null
          locale: string | null
          order_number: string
          paid_at: string | null
          parcel_size: string | null
          pickup_city: string | null
          pickup_notes: string | null
          platform_commission_cents: number | null
          receiver_email: string | null
          receiver_name: string | null
          receiver_phone: string | null
          refund_amount: number | null
          refund_note: string | null
          refund_reason: string | null
          refunded_at: string | null
          review_reminder_sent_at: string | null
          seller_decline_reason: string | null
          seller_id: string
          seller_responded_at: string | null
          seller_response_deadline: string | null
          seller_wallet_credit_cents: number | null
          sender_country: string | null
          shipping_cost: number
          shipping_method: string
          shipping_net_cents: number | null
          shipping_vat_cents: number | null
          shipping_vat_rate: number | null
          status: string
          total_amount: number
          tracking_url: string | null
          unisend_parcel_id: number | null
          unisend_request_id: string | null
          updated_at: string | null
          wallet_credited_at: string | null
        }
        Insert: {
          barcode?: string | null
          buyer_id: string
          buyer_wallet_debit_cents?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_net_cents?: number | null
          commission_vat_cents?: number | null
          commission_vat_rate?: number | null
          created_at?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          destination_terminal_address?: string | null
          destination_terminal_id?: string | null
          destination_terminal_name?: string | null
          dispute_description?: string | null
          dispute_photo_urls?: string[] | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolution_note?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          dispute_seller_deadline?: string | null
          dispute_seller_responded_at?: string | null
          dispute_seller_response?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          everypay_payment_reference?: string | null
          everypay_payment_state?: string | null
          id?: string
          items_total: number
          label_error?: string | null
          label_generated_at?: string | null
          label_url?: string | null
          locale?: string | null
          order_number: string
          paid_at?: string | null
          parcel_size?: string | null
          pickup_city?: string | null
          pickup_notes?: string | null
          platform_commission_cents?: number | null
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          refund_amount?: number | null
          refund_note?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          review_reminder_sent_at?: string | null
          seller_decline_reason?: string | null
          seller_id: string
          seller_responded_at?: string | null
          seller_response_deadline?: string | null
          seller_wallet_credit_cents?: number | null
          sender_country?: string | null
          shipping_cost?: number
          shipping_method: string
          shipping_net_cents?: number | null
          shipping_vat_cents?: number | null
          shipping_vat_rate?: number | null
          status?: string
          total_amount: number
          tracking_url?: string | null
          unisend_parcel_id?: number | null
          unisend_request_id?: string | null
          updated_at?: string | null
          wallet_credited_at?: string | null
        }
        Update: {
          barcode?: string | null
          buyer_id?: string
          buyer_wallet_debit_cents?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_net_cents?: number | null
          commission_vat_cents?: number | null
          commission_vat_rate?: number | null
          created_at?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          destination_terminal_address?: string | null
          destination_terminal_id?: string | null
          destination_terminal_name?: string | null
          dispute_description?: string | null
          dispute_photo_urls?: string[] | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolution_note?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          dispute_seller_deadline?: string | null
          dispute_seller_responded_at?: string | null
          dispute_seller_response?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          everypay_payment_reference?: string | null
          everypay_payment_state?: string | null
          id?: string
          items_total?: number
          label_error?: string | null
          label_generated_at?: string | null
          label_url?: string | null
          locale?: string | null
          order_number?: string
          paid_at?: string | null
          parcel_size?: string | null
          pickup_city?: string | null
          pickup_notes?: string | null
          platform_commission_cents?: number | null
          receiver_email?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          refund_amount?: number | null
          refund_note?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          review_reminder_sent_at?: string | null
          seller_decline_reason?: string | null
          seller_id?: string
          seller_responded_at?: string | null
          seller_response_deadline?: string | null
          seller_wallet_credit_cents?: number | null
          sender_country?: string | null
          shipping_cost?: number
          shipping_method?: string
          shipping_net_cents?: number | null
          shipping_vat_cents?: number | null
          shipping_vat_rate?: number | null
          status?: string
          total_amount?: number
          tracking_url?: string | null
          unisend_parcel_id?: number | null
          unisend_request_id?: string | null
          updated_at?: string | null
          wallet_credited_at?: string | null
        }
        Relationships: []
      }
      play_completions: {
        Row: {
          completed_at: string
          created_at: string | null
          guess_count: number
          id: string
          puzzle_number: number
          status: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          completed_at: string
          created_at?: string | null
          guess_count: number
          id?: string
          puzzle_number: number
          status: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          guess_count?: number
          id?: string
          puzzle_number?: number
          status?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      play_daily_puzzles: {
        Row: {
          bgg_categories: string[] | null
          bgg_mechanics: string[] | null
          bgg_weight: number | null
          created_at: string | null
          game_id: number
          id: string
          puzzle_number: number
        }
        Insert: {
          bgg_categories?: string[] | null
          bgg_mechanics?: string[] | null
          bgg_weight?: number | null
          created_at?: string | null
          game_id: number
          id?: string
          puzzle_number: number
        }
        Update: {
          bgg_categories?: string[] | null
          bgg_mechanics?: string[] | null
          bgg_weight?: number | null
          created_at?: string | null
          game_id?: number
          id?: string
          puzzle_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "play_daily_puzzles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_daily_puzzles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "stats_game_pricing"
            referencedColumns: ["bgg_game_id"]
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
      security_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          average_rating: number | null
          created_at: string | null
          dac7_address_city: string | null
          dac7_address_country: string | null
          dac7_address_postal_code: string | null
          dac7_address_street: string | null
          dac7_annual_sales_total: number | null
          dac7_annual_transaction_count: number | null
          dac7_compliance_status: string | null
          dac7_date_of_birth: string | null
          dac7_full_legal_name: string | null
          dac7_info_submitted_at: string | null
          dac7_info_verified: boolean | null
          dac7_reporting_year: number | null
          dac7_tax_id: string | null
          dac7_tax_id_type: string | null
          dac7_tax_residency_country: string | null
          is_founding_seller: boolean
          member_since: string | null
          payout_account_holder_name: string | null
          payout_iban: string | null
          positive_rating_percent: number | null
          seller_status: string
          seller_terms_accepted_at: string | null
          seller_terms_version: string | null
          total_completed_sales: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          dac7_address_city?: string | null
          dac7_address_country?: string | null
          dac7_address_postal_code?: string | null
          dac7_address_street?: string | null
          dac7_annual_sales_total?: number | null
          dac7_annual_transaction_count?: number | null
          dac7_compliance_status?: string | null
          dac7_date_of_birth?: string | null
          dac7_full_legal_name?: string | null
          dac7_info_submitted_at?: string | null
          dac7_info_verified?: boolean | null
          dac7_reporting_year?: number | null
          dac7_tax_id?: string | null
          dac7_tax_id_type?: string | null
          dac7_tax_residency_country?: string | null
          is_founding_seller?: boolean
          member_since?: string | null
          payout_account_holder_name?: string | null
          payout_iban?: string | null
          positive_rating_percent?: number | null
          seller_status?: string
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          total_completed_sales?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          dac7_address_city?: string | null
          dac7_address_country?: string | null
          dac7_address_postal_code?: string | null
          dac7_address_street?: string | null
          dac7_annual_sales_total?: number | null
          dac7_annual_transaction_count?: number | null
          dac7_compliance_status?: string | null
          dac7_date_of_birth?: string | null
          dac7_full_legal_name?: string | null
          dac7_info_submitted_at?: string | null
          dac7_info_verified?: boolean | null
          dac7_reporting_year?: number | null
          dac7_tax_id?: string | null
          dac7_tax_id_type?: string | null
          dac7_tax_residency_country?: string | null
          is_founding_seller?: boolean
          member_since?: string | null
          payout_account_holder_name?: string | null
          payout_iban?: string | null
          positive_rating_percent?: number | null
          seller_status?: string
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
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
        ]
      }
      seller_reviews: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          is_hidden: boolean
          order_id: string
          rating: number
          report_reason: string | null
          reported_at: string | null
          reported_by: string | null
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
          is_hidden?: boolean
          order_id: string
          rating: number
          report_reason?: string | null
          reported_at?: string | null
          reported_by?: string | null
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
          is_hidden?: boolean
          order_id?: string
          rating?: number
          report_reason?: string | null
          reported_at?: string | null
          reported_by?: string | null
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
          {
            foreignKeyName: "seller_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_with_participants"
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
          {
            foreignKeyName: "tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string | null
          description: string
          email: string | null
          id: string
          internal_notes: string | null
          locale: string | null
          page_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          viewport_size: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          locale?: string | null
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_size?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          locale?: string | null
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_size?: string | null
        }
        Relationships: []
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
          original_email: string | null
          phone: string | null
          preferred_delivery_country: string | null
          preferred_locale: string | null
          preferred_terminal_address: string | null
          preferred_terminal_id: string | null
          preferred_terminal_name: string | null
          recovery_codes: string[] | null
          recovery_codes_generated_at: string | null
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
          original_email?: string | null
          phone?: string | null
          preferred_delivery_country?: string | null
          preferred_locale?: string | null
          preferred_terminal_address?: string | null
          preferred_terminal_id?: string | null
          preferred_terminal_name?: string | null
          recovery_codes?: string[] | null
          recovery_codes_generated_at?: string | null
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
          original_email?: string | null
          phone?: string | null
          preferred_delivery_country?: string | null
          preferred_locale?: string | null
          preferred_terminal_address?: string | null
          preferred_terminal_id?: string | null
          preferred_terminal_name?: string | null
          recovery_codes?: string[] | null
          recovery_codes_generated_at?: string | null
          recovery_deadline?: string | null
          seller_terms_accepted_at?: string | null
          seller_terms_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
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
          expansion_preference: string | null
          expires_at: string | null
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
          expansion_preference?: string | null
          expires_at?: string | null
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
          expansion_preference?: string | null
          expires_at?: string | null
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
        ]
      }
      withdrawal_requests: {
        Row: {
          account_holder_name: string
          amount_cents: number
          bank_reference: string | null
          created_at: string | null
          iban: string
          id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_holder_name: string
          amount_cents: number
          bank_reference?: string | null
          created_at?: string | null
          iban: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string
          amount_cents?: number
          bank_reference?: string | null
          created_at?: string | null
          iban?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_login_activity_summary: {
        Row: {
          countries: string[] | null
          first_login: string | null
          last_login: string | null
          total_logins: number | null
          unique_countries: number | null
          unique_ips: number | null
          user_id: string | null
        }
        Relationships: []
      }
      listing_questions_with_author: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          is_seller: boolean | null
          listing_id: string | null
          parent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "listing_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "listing_questions_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      listings_with_details: {
        Row: {
          all_components_present: boolean | null
          auction_anti_snipe_extended: boolean | null
          auction_bid_count: number | null
          auction_cooldown_hours: number | null
          auction_current_bid: number | null
          auction_duration_days: number | null
          auction_end_strategy: string | null
          auction_ends_at: string | null
          auction_payment_deadline: string | null
          auction_start_price: number | null
          auction_winner_id: string | null
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
          listing_type: string | null
          missing_components: string | null
          photo_urls: string[] | null
          previous_price: number | null
          price: number | null
          pricing_format: string | null
          publisher: string | null
          reserved_by: string | null
          reserved_until: string | null
          seller_avatar_url: string | null
          seller_average_rating: number | null
          seller_badge_tier: string | null
          seller_country: string | null
          seller_id: string | null
          seller_is_founding_seller: boolean | null
          seller_member_since: string | null
          seller_name: string | null
          seller_positive_rating_percent: number | null
          seller_total_completed_sales: number | null
          seller_total_reviews: number | null
          shipping_local_pickup: boolean | null
          shipping_notes: string | null
          shipping_parcel_locker: boolean | null
          status: string | null
          transaction_method: string | null
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
        ]
      }
      notifications_with_context: {
        Row: {
          actor_id: string | null
          auction_ends_at: string | null
          bid_amount: number | null
          body: string | null
          created_at: string | null
          game_name: string | null
          id: string | null
          listing_id: string | null
          order_id: string | null
          previous_bid: number | null
          raw_data: Json | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: never
          auction_ends_at?: never
          bid_amount?: never
          body?: string | null
          created_at?: string | null
          game_name?: never
          id?: string | null
          listing_id?: never
          order_id?: never
          previous_bid?: never
          raw_data?: Json | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: never
          auction_ends_at?: never
          bid_amount?: never
          body?: string | null
          created_at?: string | null
          game_name?: never
          id?: string | null
          listing_id?: never
          order_id?: never
          previous_bid?: never
          raw_data?: Json | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders_with_participants: {
        Row: {
          barcode: string | null
          buyer_avatar: string | null
          buyer_country: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_wallet_debit_cents: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          delivered_at: string | null
          destination_country: string | null
          destination_terminal_address: string | null
          destination_terminal_id: string | null
          destination_terminal_name: string | null
          dispute_description: string | null
          dispute_photo_urls: string[] | null
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolution_note: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          dispute_seller_responded_at: string | null
          dispute_seller_response: string | null
          dispute_status: string | null
          disputed_at: string | null
          everypay_payment_reference: string | null
          everypay_payment_state: string | null
          id: string | null
          items_total: number | null
          label_error: string | null
          label_generated_at: string | null
          label_url: string | null
          locale: string | null
          order_number: string | null
          paid_at: string | null
          parcel_size: string | null
          pickup_city: string | null
          pickup_notes: string | null
          platform_commission_cents: number | null
          receiver_email: string | null
          receiver_name: string | null
          receiver_phone: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          seller_avatar: string | null
          seller_country: string | null
          seller_decline_reason: string | null
          seller_id: string | null
          seller_name: string | null
          seller_responded_at: string | null
          seller_response_deadline: string | null
          seller_status: string | null
          seller_wallet_credit_cents: number | null
          sender_country: string | null
          shipping_cost: number | null
          shipping_method: string | null
          status: string | null
          total_amount: number | null
          tracking_url: string | null
          unisend_parcel_id: number | null
          unisend_request_id: string | null
          updated_at: string | null
          wallet_credited_at: string | null
        }
        Relationships: []
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
          is_founding_seller: boolean | null
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
          is_founding_seller?: boolean | null
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
          is_founding_seller?: boolean | null
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
        ]
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
          is_hidden: boolean | null
          order_id: string | null
          order_number: string | null
          rating: number | null
          reported_at: string | null
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
          {
            foreignKeyName: "seller_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_with_participants"
            referencedColumns: ["id"]
          },
        ]
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
      can_cancel_auction: { Args: { p_listing_id: string }; Returns: boolean }
      can_respond_to_wanted_listing: {
        Args: { p_seller_id: string; p_wanted_listing_id: string }
        Returns: boolean
      }
      cleanup_expired_cart_items: { Args: never; Returns: number }
      cleanup_old_login_activity: { Args: never; Returns: undefined }
      cleanup_old_security_audit_logs: { Args: never; Returns: number }
      complete_delivered_orders: { Args: never; Returns: number }
      consume_recovery_code: {
        Args: { code_to_use: string; target_user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_body?: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_order_from_auction: {
        Args: {
          p_buyer_id: string
          p_buyer_wallet_debit_cents?: number
          p_destination_country?: string
          p_destination_terminal_address?: string
          p_destination_terminal_id?: string
          p_destination_terminal_name?: string
          p_everypay_payment_reference?: string
          p_listing_id: string
          p_locale?: string
          p_pickup_city?: string
          p_pickup_notes?: string
          p_platform_commission_cents?: number
          p_receiver_email?: string
          p_receiver_name?: string
          p_receiver_phone?: string
          p_seller_id: string
          p_seller_wallet_credit_cents?: number
          p_shipping_cost?: number
          p_shipping_method: string
          p_winning_bid_euros?: number
        }
        Returns: Json
      }
      create_order_from_basket:
        | {
            Args: {
              p_basket_id: string
              p_buyer_wallet_debit_cents?: number
              p_destination_country?: string
              p_destination_terminal_address?: string
              p_destination_terminal_id?: string
              p_destination_terminal_name?: string
              p_everypay_payment_reference?: string
              p_pickup_city?: string
              p_pickup_notes?: string
              p_receiver_email?: string
              p_receiver_name?: string
              p_receiver_phone?: string
              p_shipping_cost?: number
              p_shipping_method: string
            }
            Returns: Json
          }
        | {
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
      create_withdrawal_request: {
        Args: {
          p_account_holder_name: string
          p_amount_cents: number
          p_iban: string
          p_user_id: string
        }
        Returns: Json
      }
      credit_seller_wallet: { Args: { p_order_id: string }; Returns: Json }
      credit_wallet: {
        Args: {
          p_amount_cents: number
          p_description?: string
          p_order_id: string
          p_user_id: string
        }
        Returns: Json
      }
      debit_buyer_wallet: {
        Args: { p_amount_cents: number; p_order_id: string; p_user_id: string }
        Returns: Json
      }
      expire_wanted_listings: { Args: never; Returns: number }
      extend_cart_reservation: {
        Args: { p_basket_id: string; p_buyer_id: string }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      get_cart: { Args: { p_buyer_id: string }; Returns: Json }
      get_listing_question_count: {
        Args: { p_listing_id: string }
        Returns: number
      }
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
      get_suspicious_login_activity: {
        Args: { p_days?: number; p_min_unique_ips?: number }
        Returns: {
          countries: string[]
          email: string
          last_login: string
          total_logins: number
          unique_countries: number
          unique_ips: number
          user_id: string
        }[]
      }
      get_unread_message_count: {
        Args: { user_uuid: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      handle_expired_auction_payments: { Args: never; Returns: Json }
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
      link_newsletter_to_user: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      place_bid: {
        Args: {
          p_amount: number
          p_bidder_id: string
          p_ip_address?: unknown
          p_listing_id: string
          p_user_agent?: string
        }
        Returns: Json
      }
      post_transaction_system_message: {
        Args: { p_content: string; p_message_type: string; p_order_id: string }
        Returns: string
      }
      process_ended_auctions: { Args: never; Returns: Json }
      refresh_game_pricing_stats: { Args: never; Returns: undefined }
      reject_withdrawal_request: {
        Args: {
          p_processed_by: string
          p_reason: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
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

