// Hand-maintained mirror of supabase/migrations/*.sql.
//
// Once the project exists you can replace this with generated output:
//   bunx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
//
// NOTE: the row shapes below must stay `type` aliases, not `interface`.
// postgrest-js constrains tables to `Record<string, unknown>`, and TypeScript
// only grants implicit index signatures to type aliases, an interface here
// silently collapses the whole schema to `never`.

import type { Lang } from "@/lib/i18n";

export type SubscriptionStatus = "none" | "active" | "cancelled" | "past_due" | "trialing";

export type SubscriptionPlan = "none" | "mystic" | "ascended";

export type ReadingKind = "tarot" | "compatibility" | "personality" | "zodiac";

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  birth_date: string | null;
  interests: string[];
  hobbies: string[];
  cosmic_vibe: string | null;
  /** Tarot & Magic quiz result (major-arcana archetype key). */
  personality_archetype: string | null;
  lang: Lang | null;
  muted: boolean;
  onboarding_complete: boolean;
  streak: number;
  best_streak: number;
  last_visit: string | null;
  streak_rewards_claimed: number[];
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  /** App badge: false until user opens a verification link (login is not blocked). */
  email_verified: boolean;
  /** Set when user taps “send verify”; cleared when email_verified flips true. */
  email_verify_sent_at: string | null;
  /** Ops hard ban — blocked from app use. */
  banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  /** Ops soft restrict — chat/readings blocked. */
  chat_restricted: boolean;
  mod_notes: string | null;
  /** Soft monitoring without a ban. */
  watchlist: boolean;
  created_at: string;
  updated_at: string;
};

export type EnergyBalanceRow = {
  user_id: string;
  balance: number;
  daily_cap: number;
  last_refill_on: string | null;
  /** ISO timestamptz - free top-up available at/after this instant. */
  next_free_refill_at: string | null;
  ad_claims_on: string | null;
  ad_claims_today: number;
  /** Ops grant: spend_energy never deducts. */
  unlimited: boolean;
  updated_at: string;
};

export type SubscriptionRow = {
  user_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  creem_customer_id: string | null;
  creem_subscription_id: string | null;
  flitt_order_id: string | null;
  flitt_payment_id: string | null;
  flitt_rectoken: string | null;
  whop_membership_id: string | null;
  whop_customer_id: string | null;
  whop_manage_url: string | null;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  /** Complimentary grant from ops console. */
  is_comp: boolean;
  granted_by: string | null;
  grant_note: string | null;
  updated_at: string;
};

export type StripeWebhookEventRow = {
  id: string;
  type: string;
  processed_at: string;
};

export type CreemWebhookEventRow = {
  id: string;
  type: string;
  processed_at: string;
};

export type WhopWebhookEventRow = {
  id: string;
  type: string;
  processed_at: string;
};

export type FlittOrderRow = {
  order_id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FlittWebhookEventRow = {
  id: string;
  type: string;
  processed_at: string;
};

export type ReadingHistoryRow = {
  id: string;
  user_id: string;
  kind: ReadingKind;
  lang: Lang;
  cards: string[];
  input: Record<string, unknown>;
  result_text: string;
  energy_spent: number;
  created_at: string;
};

export type ContactMessageRow = {
  id: string;
  kind: "support" | "feedback";
  name: string;
  email: string;
  message: string;
  user_id: string | null;
  status: "open" | "pending" | "resolved" | "spam";
  staff_reply: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type ChatStateRow = {
  user_id: string;
  messages: unknown;
  service: string | null;
  updated_at: string;
};

export type AiReplyRateEventRow = {
  id: number;
  user_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      energy_balance: {
        Row: EnergyBalanceRow;
        Insert: Partial<EnergyBalanceRow> & { user_id: string };
        Update: Partial<EnergyBalanceRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Partial<SubscriptionRow> & { user_id: string };
        Update: Partial<SubscriptionRow>;
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: StripeWebhookEventRow;
        Insert: Partial<StripeWebhookEventRow> & { id: string; type: string };
        Update: Partial<StripeWebhookEventRow>;
        Relationships: [];
      };
      creem_webhook_events: {
        Row: CreemWebhookEventRow;
        Insert: Partial<CreemWebhookEventRow> & { id: string; type: string };
        Update: Partial<CreemWebhookEventRow>;
        Relationships: [];
      };
      whop_webhook_events: {
        Row: WhopWebhookEventRow;
        Insert: Partial<WhopWebhookEventRow> & { id: string; type: string };
        Update: Partial<WhopWebhookEventRow>;
        Relationships: [];
      };
      flitt_orders: {
        Row: FlittOrderRow;
        Insert: Partial<FlittOrderRow> & {
          order_id: string;
          user_id: string;
          plan: string;
          amount: number;
        };
        Update: Partial<FlittOrderRow>;
        Relationships: [];
      };
      flitt_webhook_events: {
        Row: FlittWebhookEventRow;
        Insert: Partial<FlittWebhookEventRow> & { id: string; type: string };
        Update: Partial<FlittWebhookEventRow>;
        Relationships: [];
      };
      reading_history: {
        Row: ReadingHistoryRow;
        Insert: Omit<ReadingHistoryRow, "id" | "created_at"> &
          Partial<Pick<ReadingHistoryRow, "id" | "created_at">>;
        Update: Partial<ReadingHistoryRow>;
        Relationships: [];
      };
      contact_messages: {
        Row: ContactMessageRow;
        Insert: Omit<ContactMessageRow, "id" | "created_at"> &
          Partial<Pick<ContactMessageRow, "id" | "created_at">>;
        Update: Partial<ContactMessageRow>;
        Relationships: [];
      };
      chat_state: {
        Row: ChatStateRow;
        Insert: Partial<ChatStateRow> & { user_id: string; messages?: unknown };
        Update: Partial<ChatStateRow>;
        Relationships: [];
      };
      ai_reply_rate_events: {
        Row: AiReplyRateEventRow;
        Insert: Partial<AiReplyRateEventRow> & { user_id: string };
        Update: Partial<AiReplyRateEventRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_ai_reply_slot: {
        Args: { p_max_per_minute?: number };
        Returns: boolean;
      };
      spend_energy: {
        Args: { amount: number };
        Returns: number;
      };
      claim_daily_energy: {
        Args: Record<string, never>;
        Returns: number;
      };
      begin_ad_watch: {
        Args: { p_user_id: string; p_source?: string };
        Returns: {
          ticket: string;
          ticket_id: string;
          eligible_at: string;
          expires_at: string;
          min_watch_seconds: number;
        };
      };
      claim_ad_energy: {
        Args: { p_user_id: string; p_ticket: string };
        Returns: number;
      };
      claim_streak_reward: {
        Args: { milestone: number };
        Returns: number;
      };
      record_daily_streak: {
        Args: Record<string, never>;
        Returns: {
          streak: number;
          best_streak: number;
          last_visit: string | null;
        };
      };
      complete_onboarding: {
        Args: {
          p_interests?: string[];
          p_hobbies?: string[];
          p_cosmic_vibe?: string | null;
          p_lang?: string | null;
        };
        Returns: ProfileRow;
      };
      sync_email_verified: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      mark_email_unverified: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      grant_purchase_energy: {
        Args: { p_user_id: string; p_amount: number };
        Returns: number;
      };
      apply_plan_daily_cap: {
        Args: { p_user_id: string; p_daily_cap: number };
        Returns: number;
      };
      submit_contact_message: {
        Args: {
          p_kind: string;
          p_name: string;
          p_email: string;
          p_message: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
