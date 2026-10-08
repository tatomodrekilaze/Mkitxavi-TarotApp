import { createContext, useContext } from "react";
import type { Lang } from "@/lib/i18n";
import type { ArchetypeKey } from "@/lib/personality";
import type { OpsPublicAnnouncement, OpsPublicFlags } from "@/lib/ops-runtime";
import type { SubscriptionPlan } from "@/lib/supabase/types";

// The context object and its types live apart from AppProvider on purpose.
// If createContext() runs inside the same module as the component, every hot
// reload of that module mints a fresh context identity while the mounted tree
// still holds the old one, and useContext starts returning null mid-session.

export type SubStatus = "none" | "active" | "cancelled" | "past_due" | "trialing";
export type SubPlan = SubscriptionPlan;

export interface UserProfile {
  registered: boolean;
  name: string;
  avatarUrl: string;
  birthDate: string;
  interests: string[];
  hobbies: string[];
  /** Onboarding mood key, e.g. vibeCalm. */
  cosmicVibe: string;
}

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthResult {
  ok: boolean;
  /** i18n key describing the failure, translated by the caller. */
  errorKey?: string;
  /** Raw message from Supabase, for cases we have no specific copy for. */
  errorDetail?: string;
  /** Signup succeeded; user must open the verification link in email. */
  needsEmailConfirm?: boolean;
  /** Soft hint: verify email later in Settings (does not block entry). */
  softVerifyHint?: boolean;
}

export interface AppState {
  ready: boolean;
  /** False when .env has no Supabase credentials yet. */
  configured: boolean;
  authStatus: AuthStatus;
  authenticated: boolean;
  email: string | null;
  /** False until the user confirms via the email link (optional after signup). */
  emailVerified: boolean;
  /** True after a verify email was requested and before the link is opened. */
  emailVerifyPending: boolean;
  /**
   * True after the first profile fetch for the current session finishes.
   * Gates onboarding so a refresh does not flash the interests step while
   * `user.registered` is still the empty default.
   */
  profileLoaded: boolean;

  /** UI language. Defaults to Georgian; changeable in Settings. */
  lang: Lang | null;
  /** Retired language-portal flag (always treated as seen). */
  seenPortal: boolean;
  muted: boolean;
  energy: number;
  /** Ops grant: spend never deducts; UI treats wallet as uncapped. */
  energyUnlimited: boolean;
  /**
   * When free daily energy returns after the grant is spent to 0.
   * ISO timestamptz from the server, or null when no cooldown is active.
   */
  nextFreeRefillAt: string | null;
  /** Successful ad watches used today (resets server-side each calendar day). */
  adsClaimedToday: number;
  sub: SubStatus;
  /** mystic = 30/day; ascended = 150/day (photo unlock for both). */
  subPlan: SubPlan;
  /** Ops DevConsole complimentary grant. */
  isComp: boolean;
  /** True when the user cancelled but keeps access until period end. */
  cancelAtPeriodEnd: boolean;
  /** ISO date/time when the current paid period ends, if known. */
  currentPeriodEnd: string | null;
  /** Whop membership manage URL (cancel / update card), if any. */
  whopManageUrl: string | null;
  /** Reload energy + subscription from Supabase (e.g. after Stripe return). */
  refreshWallet: () => Promise<{ canPhoto: boolean }>;
  /** Ops console hard ban. */
  accountBanned: boolean;
  banReason: string | null;
  /** Ops soft restrict — chat/readings blocked. */
  accountRestricted: boolean;
  /** Live kill switches from ops console (maintenance, chat, ads, …). */
  opsFlags: OpsPublicFlags;
  /** Active site banners from ops announcements. */
  opsAnnouncements: OpsPublicAnnouncement[];
  /** Re-fetch kill switches / banners. */
  refreshOpsRuntime: () => Promise<void>;
  user: UserProfile;
  streak: number;
  bestStreak: number;
  lastVisit: string;
  /** Milestone days already claimed (5, 10, 20, …). */
  streakRewardsClaimed: number[];
  /** Persisted Tarot & Magic personality result (forever until Redo). */
  personalityArchetype: ArchetypeKey | null;
  savePersonalityArchetype: (key: ArchetypeKey) => Promise<void>;
  clearPersonalityArchetype: () => Promise<void>;

  t: (key: string) => string;
  setLang: (l: Lang) => void;
  setMuted: (m: boolean) => void;
  markPortalSeen: () => void;

  signUp: (
    email: string,
    password: string,
    name: string,
    birthDate: string,
    marketingOptIn?: boolean,
  ) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Google / Facebook, redirects away to the provider. */
  signInWithOAuth: (provider: "google" | "facebook") => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Emails a recovery link pointing at /reset-password. */
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  /** Valid only while a recovery session from that link is active. */
  updatePassword: (password: string) => Promise<AuthResult>;
  /** Settings: verify current password, then set a new one. */
  changePassword: (currentPassword: string, nextPassword: string) => Promise<AuthResult>;

  /**
   * Partial: name and birth date are captured at sign-up, so onboarding only
   * sends the fields it actually collects. Any key left out is not written.
   */
  saveProfile: (p: Partial<Omit<UserProfile, "registered">>) => Promise<AuthResult>;
  /** Updates display name only, does not touch onboarding flags. */
  updateDisplayName: (name: string) => Promise<AuthResult>;
  /** Starts Supabase's email-change flow (confirm link to the new address). */
  updateEmail: (email: string) => Promise<AuthResult>;
  /** Resends the signup confirmation email so the user can verify later. */
  resendEmailVerification: () => Promise<AuthResult>;
  /** Uploads a square-ish image to Storage and stores the public URL. */
  updateAvatar: (file: File) => Promise<AuthResult>;
  /** Resolves false when the user cannot afford the cost. */
  spendEnergy: (n: number) => Promise<boolean>;
  /** Adopts an authoritative balance a server function already charged. */
  applyEnergy: (balance: number) => void;
  /** Redeem a server-issued ad watch ticket (never call the DB RPC from the browser). */
  claimAdEnergy: (ticket: string) => Promise<AuthResult>;
  /** Mint a timed watch ticket before showing the ad. */
  beginAdWatch: (
    source: "overlay" | "gam" | "simulate",
  ) => Promise<
    | { ok: true; ticket: string; minWatchSeconds: number }
    | { ok: false; errorKey?: string; errorDetail?: string }
  >;
  /** Claim a streak milestone reward (adds energy server-side). */
  claimStreakReward: (milestone: number) => Promise<AuthResult>;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
