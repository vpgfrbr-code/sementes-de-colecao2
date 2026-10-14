// Placeholder types — regenerate from Supabase after running migrations:
// pnpm supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts

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
      coupons: {
        Row: {
          id: string;
          code: string;
          type: string;
          value: number;
          min_order_cents: number;
          max_uses: number | null;
          max_uses_per_user: number | null;
          used_count: number;
          reseller_user_id: string | null;
          reseller_name: string | null;
          reseller_email: string | null;
          commission_percent: number | null;
          active: boolean;
          expires_at: string | null;
          persistence_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: string;
          value: number;
          min_order_cents?: number;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          used_count?: number;
          reseller_user_id?: string | null;
          reseller_name?: string | null;
          reseller_email?: string | null;
          commission_percent?: number | null;
          active?: boolean;
          expires_at?: string | null;
          persistence_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: string;
          value?: number;
          min_order_cents?: number;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          used_count?: number;
          reseller_user_id?: string | null;
          reseller_name?: string | null;
          reseller_email?: string | null;
          commission_percent?: number | null;
          active?: boolean;
          expires_at?: string | null;
          persistence_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      coupon_usage_reservations: {
        Row: {
          id: string;
          coupon_id: string;
          order_id: string;
          status: string;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          order_id: string;
          status: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          order_id?: string;
          status?: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_usage_reservations_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_usage_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_lookup_tokens: {
        Row: {
          id: string;
          email: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      category_translations: {
        Row: {
          id: string;
          category_id: string;
          locale: string;
          name: string;
          description: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          locale: string;
          name: string;
          description?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          locale?: string;
          name?: string;
          description?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      bundle_components: {
        Row: {
          id: string;
          bundle_product_id: string;
          component_product_id: string;
          seed_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          bundle_product_id: string;
          component_product_id: string;
          seed_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          bundle_product_id?: string;
          component_product_id?: string;
          seed_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_components_bundle_product_id_fkey";
            columns: ["bundle_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_components_component_product_id_fkey";
            columns: ["component_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          product_type: string;
          price_cents: number;
          shipping_cents: number;
          stock: number;
          images: string[];
          active: boolean;
          category_id: string | null;
          seed_type: string | null;
          flowering_weeks_min: number | null;
          flowering_weeks_max: number | null;
          thc_min: number | null;
          thc_max: number | null;
          cbd_min: number | null;
          cbd_max: number | null;
          genetics: string | null;
          parent_mother: string | null;
          parent_father: string | null;
          real_photos: string[];
          show_real_photos: boolean;
          seed_bank_id: string | null;
          is_featured: boolean;
          featured_order: number;
          hero_video_url: string | null;
          hero_poster_url: string | null;
          hero_frame_count: number | null;
          specimen_code: string | null;
          on_sale: boolean;
          discount_type: string | null;
          discount_value: number | null;
          sale_ends_at: string | null;
          variant_discounts_enabled: boolean;
          flavors: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          product_type?: string;
          price_cents: number;
          shipping_cents?: number;
          stock?: number;
          images?: string[];
          active?: boolean;
          category_id?: string | null;
          seed_type?: string | null;
          flowering_weeks_min?: number | null;
          flowering_weeks_max?: number | null;
          thc_min?: number | null;
          thc_max?: number | null;
          cbd_min?: number | null;
          cbd_max?: number | null;
          genetics?: string | null;
          parent_mother?: string | null;
          parent_father?: string | null;
          real_photos?: string[];
          show_real_photos?: boolean;
          seed_bank_id?: string | null;
          is_featured?: boolean;
          featured_order?: number;
          hero_video_url?: string | null;
          hero_poster_url?: string | null;
          hero_frame_count?: number | null;
          specimen_code?: string | null;
          on_sale?: boolean;
          discount_type?: string | null;
          discount_value?: number | null;
          sale_ends_at?: string | null;
          variant_discounts_enabled?: boolean;
          flavors?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          product_type?: string;
          price_cents?: number;
          shipping_cents?: number;
          stock?: number;
          images?: string[];
          active?: boolean;
          category_id?: string | null;
          seed_type?: string | null;
          flowering_weeks_min?: number | null;
          flowering_weeks_max?: number | null;
          thc_min?: number | null;
          thc_max?: number | null;
          cbd_min?: number | null;
          cbd_max?: number | null;
          genetics?: string | null;
          parent_mother?: string | null;
          parent_father?: string | null;
          real_photos?: string[];
          show_real_photos?: boolean;
          seed_bank_id?: string | null;
          is_featured?: boolean;
          featured_order?: number;
          hero_video_url?: string | null;
          hero_poster_url?: string | null;
          hero_frame_count?: number | null;
          specimen_code?: string | null;
          on_sale?: boolean;
          discount_type?: string | null;
          discount_value?: number | null;
          sale_ends_at?: string | null;
          variant_discounts_enabled?: boolean;
          flavors?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_translations: {
        Row: {
          id: string;
          product_id: string;
          locale: string;
          name: string;
          description: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          locale: string;
          name: string;
          description: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          locale?: string;
          name?: string;
          description?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          slug: string;
          seed_count: number;
          price_cents: number;
          shipping_cents: number;
          stock: number;
          active: boolean;
          on_sale: boolean;
          discount_type: string | null;
          discount_value: number | null;
          sale_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          slug: string;
          seed_count: number;
          price_cents: number;
          shipping_cents?: number;
          stock?: number;
          active?: boolean;
          on_sale?: boolean;
          discount_type?: string | null;
          discount_value?: number | null;
          sale_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          slug?: string;
          seed_count?: number;
          price_cents?: number;
          shipping_cents?: number;
          stock?: number;
          active?: boolean;
          on_sale?: boolean;
          discount_type?: string | null;
          discount_value?: number | null;
          sale_ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          clerk_user_id: string | null;
          guest_email: string | null;
          customer_name: string | null;
          address: Json;
          subtotal_cents: number;
          discount_cents: number;
          total_cents: number;
          coupon_id: string | null;
          status: string;
          woovi_charge_id: string | null;
          woovi_correlation_id: string | null;
          pix_qr_code: string | null;
          pix_br_code: string | null;
          pix_expires_at: string | null;
          exchange_rate_used: number | null;
          total_brl_cents: number | null;
          payment_proof_path: string | null;
          payment_proof_uploaded_at: string | null;
          tracking_code: string | null;
          shipping_carrier: string | null;
          customer_tz_offset: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          guest_email?: string | null;
          customer_name?: string | null;
          address: Json;
          subtotal_cents: number;
          discount_cents?: number;
          total_cents: number;
          coupon_id?: string | null;
          status?: string;
          woovi_charge_id?: string | null;
          woovi_correlation_id?: string | null;
          pix_qr_code?: string | null;
          pix_br_code?: string | null;
          pix_expires_at?: string | null;
          exchange_rate_used?: number | null;
          total_brl_cents?: number | null;
          payment_proof_path?: string | null;
          payment_proof_uploaded_at?: string | null;
          tracking_code?: string | null;
          shipping_carrier?: string | null;
          customer_tz_offset?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string | null;
          guest_email?: string | null;
          customer_name?: string | null;
          address?: Json;
          subtotal_cents?: number;
          discount_cents?: number;
          total_cents?: number;
          coupon_id?: string | null;
          status?: string;
          woovi_charge_id?: string | null;
          woovi_correlation_id?: string | null;
          pix_qr_code?: string | null;
          pix_br_code?: string | null;
          pix_expires_at?: string | null;
          exchange_rate_used?: number | null;
          total_brl_cents?: number | null;
          payment_proof_path?: string | null;
          payment_proof_uploaded_at?: string | null;
          tracking_code?: string | null;
          shipping_carrier?: string | null;
          customer_tz_offset?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity: number;
          unit_price_cents: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      seed_banks: {
        Row: {
          id: string;
          slug: string;
          logo_url: string;
          website: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          logo_url?: string;
          website?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          logo_url?: string;
          website?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      seed_bank_translations: {
        Row: {
          id: string;
          seed_bank_id: string;
          locale: string;
          name: string;
          description: string;
        };
        Insert: {
          id?: string;
          seed_bank_id: string;
          locale: string;
          name: string;
          description?: string;
        };
        Update: {
          id?: string;
          seed_bank_id?: string;
          locale?: string;
          name?: string;
          description?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seed_bank_translations_seed_bank_id_fkey";
            columns: ["seed_bank_id"];
            isOneToOne: false;
            referencedRelation: "seed_banks";
            referencedColumns: ["id"];
          },
        ];
      };
      terpenes: {
        Row: {
          id: string;
          slug: string;
          name: string;
          aroma: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          aroma?: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          aroma?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      product_terpenes: {
        Row: {
          id: string;
          product_id: string;
          terpene_id: string;
          is_dominant: boolean;
        };
        Insert: {
          id?: string;
          product_id: string;
          terpene_id: string;
          is_dominant?: boolean;
        };
        Update: {
          id?: string;
          product_id?: string;
          terpene_id?: string;
          is_dominant?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_terpenes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_terpenes_terpene_id_fkey";
            columns: ["terpene_id"];
            isOneToOne: false;
            referencedRelation: "terpenes";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_banners: {
        Row: {
          id: string;
          image_url: string;
          image_url_mobile: string | null;
          media_type: string;
          link: string;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          image_url_mobile?: string | null;
          media_type?: string;
          link?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_url?: string;
          image_url_mobile?: string | null;
          media_type?: string;
          link?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      hero_banner_translations: {
        Row: {
          id: string;
          banner_id: string;
          locale: string;
          title: string;
          subtitle: string;
        };
        Insert: {
          id?: string;
          banner_id: string;
          locale: string;
          title?: string;
          subtitle?: string;
        };
        Update: {
          id?: string;
          banner_id?: string;
          locale?: string;
          title?: string;
          subtitle?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hero_banner_translations_banner_id_fkey";
            columns: ["banner_id"];
            isOneToOne: false;
            referencedRelation: "hero_banners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_stock: {
        Args: {
          p_product_id: string;
          p_quantity: number;
        };
        Returns: undefined;
      };
      decrement_variant_stock: {
        Args: {
          p_variant_id: string;
          p_quantity: number;
        };
        Returns: undefined;
      };
      increment_coupon_usage: {
        Args: {
          p_coupon_id: string;
        };
        Returns: undefined;
      };
      cleanup_expired_lookup_tokens: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      confirm_coupon_usage: {
        Args: {
          p_order_id: string;
        };
        Returns: boolean;
      };
      reserve_product_stock: {
        Args: {
          p_product_id: string;
          p_seed_quantity: number;
        };
        Returns: undefined;
      };
      reserve_coupon_usage: {
        Args: {
          p_coupon_id: string;
          p_order_id: string;
        };
        Returns: undefined;
      };
      release_coupon_usage_reservation: {
        Args: {
          p_order_id: string;
        };
        Returns: boolean;
      };
      restore_product_stock: {
        Args: {
          p_product_id: string;
          p_seed_quantity: number;
        };
        Returns: undefined;
      };
      get_bundle_effective_stock: {
        Args: {
          p_bundle_id: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
