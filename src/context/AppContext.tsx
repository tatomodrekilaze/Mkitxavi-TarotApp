import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { looksLikeEmailAddress } from "@/lib/auth-email";
import { checkDisposableEmail, isDisposableEmail } from "@/lib/disposable-email";
import { guardSignupEmail } from "@/lib/signup-email";
import {
  authCallbackUrl,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { normalizeLang, translations, type Lang } from "@/lib/i18n";
import { canUsePhotoUpload } from "@/lib/photo-access";
import {
  DEFAULT_OPS_RUNTIME,
  getOpsRuntime,
  type OpsPublicAnnouncement,
  type OpsPublicFlags,
} from "@/lib/ops-runtime";
import {
  AppContext,
  type AppState,
  type AuthResult,
  type AuthStatus,
  type SubPlan,
  type SubStatus,
  type UserProfile,
} from "./app-state";
import {
  clearPersonalityLocal,
  isArchetypeKey,
  loadPersonalityLocal,
  savePersonalityLocal,
  type ArchetypeKey,
} from "@/lib/personality";

// Re-exported so existing imports from "@/context/AppContext" keep working.
export { useApp } from "./app-state";
export type {
  AppState,
  AuthResult,
  AuthStatus,
  SubPlan,
  SubStatus,
  UserProfile,
} from "./app-state";

/**
 * Supabase returns a stable machine-readable `code` alongside a prose message.
 * Match on the code only. Substring-matching the message is how "Email logins
 * are disabled" ends up displayed as "Enter a valid email address".
 */
function authErrorKey(code: string | undefined, message?: string): string | undefined {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("disposable_email_not_allowed") || msg.includes("disposable email")) {
    return "authDisposableEmail";
  }
  switch (code) {
    case "invalid_credentials":
      return "authInvalidCreds";
    case "email_address_invalid":
      return "authEmailInvalid";
    case "email_address_not_authorized":
      return "authDisposableEmail";
    case "user_already_exists":
    case "email_exists":
      return "authEmailTaken";
    case "weak_password":
    case "password_too_short":
      return "authWeakPassword";
    case "email_not_confirmed":
      return "authEmailNotConfirmed";
    // Distinct causes with distinct fixes: the first is the mailer's hourly
    // quota, the second is general request throttling.
    case "over_email_send_rate_limit":
      return "authEmailRateLimited";
    case "over_request_rate_limit":
      return "authRateLimited";
    case "signup_disabled":
    case "email_provider_disabled":
      return "authSignupDisabled";
    case "same_password":
      return "authSamePassword";
    default:
      // Unrecognised: show Supabase's own wording rather than inventing one.
      return undefined;
  }
}

/**
 * Only presentation preferences live locally now. Language defaults to
 * Georgian so the public landing (Google branding / SEO) is never gated
 * behind a language picker. Users can switch language in Settings.
 */
const LOCAL_PREFS_KEY = "mkitxavi.prefs.v2";
/** Pre-Supabase key, read once to carry existing testers over. */
const LEGACY_STATE_KEY = "mkitxavi.state.v1";

interface LocalPrefs {
  lang: Lang;
  /** Kept for storage compatibility; language portal is retired. */
  seenPortal: boolean;
  muted: boolean;
}

const EMPTY_PROFILE: UserProfile = {
  registered: false,
  name: "",
  avatarUrl: "",
  birthDate: "",
  interests: [],
  hobbies: [],
  cosmicVibe: "",
};

function loadPrefs(): LocalPrefs {
  const fresh: LocalPrefs = { lang: "ka", seenPortal: true, muted: false };
  if (typeof window === "undefined") return fresh;

  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (raw) {
      const parsed = { ...fresh, ...(JSON.parse(raw) as Partial<LocalPrefs>) };
      return {
        ...parsed,
        lang: normalizeLang(parsed.lang as string | null) ?? "ka",
        seenPortal: true,
      };
    }

    // First run after the backend migration: inherit language choice from the
    // old localStorage blob. Account data is not migrated.
    const legacy = window.localStorage.getItem(LEGACY_STATE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<{
        lang: string | null;
        seenPortal: boolean;
        muted: boolean;
      }>;
      return {
        lang: normalizeLang(parsed.lang) ?? "ka",
        seenPortal: true,
        muted: Boolean(parsed.muted),
      };
    }
  } catch {
    /* corrupt storage is not worth crashing over */
  }
  return fresh;
}

function profileFromRow(row: ProfileRow | null): UserProfile {
  if (!row) return EMPTY_PROFILE;
  const rawName = (row.display_name ?? "").trim();
  // Never surface an email address as the seeker's name in the UI.
  const name = looksLikeEmailAddress(rawName) ? "" : rawName;
  return {
    registered: row.onboarding_complete,
    name,
    avatarUrl: row.avatar_url ?? "",
    birthDate: row.birth_date ?? "",
    interests: row.interests ?? [],
    hobbies: row.hobbies ?? [],
    cosmicVibe: row.cosmic_vibe ?? "",
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<LocalPrefs>({
    lang: "ka",
    seenPortal: true,
    muted: false,
  });

  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "signed-out",
  );
  const [session, setSession] = useState<Session | null>(null);

  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(!isSupabaseConfigured);
  const [energy, setEnergy] = useState(0);
  const [energyUnlimited, setEnergyUnlimited] = useState(false);
  const [nextFreeRefillAt, setNextFreeRefillAt] = useState<string | null>(null);
  const [adsClaimedToday, setAdsClaimedToday] = useState(0);
  const [sub, setSub] = useState<SubStatus>("none");
  const [subPlan, setSubPlan] = useState<SubPlan>("none");
  const [isComp, setIsComp] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [whopManageUrl, setWhopManageUrl] = useState<string | null>(null);
  const [opsFlags, setOpsFlags] = useState<OpsPublicFlags>(DEFAULT_OPS_RUNTIME.flags);
  const [opsAnnouncements, setOpsAnnouncements] = useState<OpsPublicAnnouncement[]>([]);

  const userId = session?.user.id ?? null;
  // Guards the once-per-session streak/refill pass.
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    if (!isSupabaseConfigured) setReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  // --- session ------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthStatus(data.session ? "signed-in" : "signed-out");
      if (!data.session) setProfileLoaded(true);
      setReady(true);
    });

    const { data: sub_ } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthStatus(next ? "signed-in" : "signed-out");
      if (!next) {
        setProfileRow(null);
        setProfileLoaded(true);
        setEnergy(0);
        setEnergyUnlimited(false);
        setNextFreeRefillAt(null);
        setAdsClaimedToday(0);
        setSub("none");
        setSubPlan("none");
        setIsComp(false);
        setCancelAtPeriodEnd(false);
        setCurrentPeriodEnd(null);
        setWhopManageUrl(null);
        syncedForUser.current = null;
      }
    });

    return () => {
      active = false;
      sub_.subscription.unsubscribe();
    };
  }, []);

  // --- server state for the signed-in user --------------------------------
  const loadUserData = useCallback(async (uid: string): Promise<{ canPhoto: boolean }> => {
    const supabase = getSupabaseBrowserClient();

    const [profileRes, energyRes, subRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("energy_balance").select("*").eq("user_id", uid).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, plan, is_comp, current_period_end, cancel_at_period_end, whop_manage_url")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    if (profileRes.data) {
      let profile = profileRes.data;
      // Heal legacy rows where someone typed an email into "name".
      if (looksLikeEmailAddress(profile.display_name)) {
        const { data: cleaned } = await supabase
          .from("profiles")
          .update({ display_name: "" })
          .eq("id", uid)
          .select("*")
          .maybeSingle();
        if (cleaned) profile = cleaned;
        else profile = { ...profile, display_name: "" };
      }
      setProfileRow(profile);
      // Prefer a saved account language when this browser has none yet.
      const profileLang = normalizeLang(profile.lang);
      if (profileLang) {
        setPrefs((p) =>
          p.lang
            ? p.seenPortal
              ? p
              : { ...p, seenPortal: true }
            : { ...p, lang: profileLang, seenPortal: true },
        );
      } else {
        // Signed-in without a portal choice, never block chat with the portal.
        setPrefs((p) => (p.seenPortal ? p : { ...p, lang: p.lang ?? "ka", seenPortal: true }));
      }
    }
    if (energyRes.data) {
      setEnergy(energyRes.data.balance);
      setEnergyUnlimited(Boolean(energyRes.data.unlimited));
      setNextFreeRefillAt(energyRes.data.next_free_refill_at ?? null);
      const today = new Date().toISOString().slice(0, 10);
      const on = energyRes.data.ad_claims_on;
      setAdsClaimedToday(on === today ? (energyRes.data.ad_claims_today ?? 0) : 0);
    } else {
      setEnergyUnlimited(false);
      setNextFreeRefillAt(null);
      setAdsClaimedToday(0);
    }
    const unlimited = energyRes.data ? Boolean(energyRes.data.unlimited) : false;
    let nextSub: SubStatus = "none";
    let nextPlan: SubPlan = "none";
    let nextComp = false;
    let nextPeriodEnd: string | null = null;
    let nextCancelAtEnd = false;
    if (subRes.data) {
      nextSub = (subRes.data.status as SubStatus) ?? "none";
      nextPlan = (subRes.data.plan as SubPlan) ?? "none";
      nextComp = Boolean(subRes.data.is_comp);
      nextCancelAtEnd = Boolean(subRes.data.cancel_at_period_end);
      nextPeriodEnd = subRes.data.current_period_end ?? null;
      setSub(nextSub);
      setSubPlan(nextPlan);
      setIsComp(nextComp);
      setCancelAtPeriodEnd(nextCancelAtEnd);
      setCurrentPeriodEnd(nextPeriodEnd);
      setWhopManageUrl(subRes.data.whop_manage_url ?? null);
    } else {
      setSub("none");
      setSubPlan("none");
      setIsComp(false);
      setCancelAtPeriodEnd(false);
      setCurrentPeriodEnd(null);
      setWhopManageUrl(null);
    }
    return {
      canPhoto: canUsePhotoUpload({
        energyUnlimited: unlimited,
        plan: nextPlan,
        status: nextSub,
        isComp: nextComp,
        periodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: nextCancelAtEnd,
      }),
    };
  }, []);

  const refreshOpsRuntime = useCallback(async () => {
    try {
      const cfg = await getOpsRuntime();
      setOpsFlags(cfg.flags);
      setOpsAnnouncements(cfg.announcements);
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    void refreshOpsRuntime();
    const id = window.setInterval(() => void refreshOpsRuntime(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshOpsRuntime();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshOpsRuntime]);

  const refreshWallet = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return { canPhoto: false };
    return loadUserData(userId);
  }, [userId, loadUserData]);

  useEffect(() => {
    if (!userId || authStatus !== "signed-in") return;
    if (syncedForUser.current === userId) return;
    syncedForUser.current = userId;
    setProfileLoaded(false);

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // Sync verified flag from Auth (RPC only — clients cannot write email_verified).
        await supabase.rpc("sync_email_verified");
        try {
          localStorage.removeItem("mkitxavi_email_verify_pending");
        } catch {
          /* ignore */
        }

        // Free top-up when the 24h cooldown has elapsed.
        const { data: refilled } = await supabase.rpc("claim_daily_energy");
        if (typeof refilled === "number") setEnergy(refilled);

        // Login streak — server-side only (cannot forge via profiles UPDATE).
        await supabase.rpc("record_daily_streak");
        await loadUserData(userId);
      } finally {
        // Only mark loaded for the user this pass started for.
        if (syncedForUser.current === userId) setProfileLoaded(true);
      }
    })();
  }, [userId, authStatus, loadUserData]);

  // Keep the chosen language on the server too, so it follows the account
  // across devices rather than living only in this browser.
  useEffect(() => {
    if (!userId || !prefs.lang) return;
    if (profileRow && profileRow.lang === prefs.lang) return;
    void getSupabaseBrowserClient().from("profiles").update({ lang: prefs.lang }).eq("id", userId);
  }, [userId, prefs.lang, profileRow]);

  // --- actions ------------------------------------------------------------
  const t = useCallback(
    (key: string) => {
      const lang = prefs.lang ?? "ka";
      return translations[lang][key] ?? translations.ka[key] ?? translations.en[key] ?? key;
    },
    [prefs.lang],
  );

  const setLang = useCallback((l: Lang) => {
    setPrefs((p) => ({ ...p, lang: l, seenPortal: true }));
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setPrefs((p) => ({ ...p, muted: m }));
  }, []);

  const markPortalSeen = useCallback(() => {
    setPrefs((p) => ({ ...p, seenPortal: true }));
  }, []);

  const notConfigured = useCallback(
    (): AuthResult => ({ ok: false, errorKey: "authNotConfigured" }),
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      birthDate: string,
      marketingOptIn = false,
    ): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      if (!opsFlags.signupsEnabled) {
        return { ok: false, errorDetail: "New signups are temporarily closed." };
      }
      // Fast local list, then server live detectors (rotating temp-mail domains).
      if (isDisposableEmail(email)) {
        return { ok: false, errorKey: "authDisposableEmail" };
      }
      try {
        const gate = await guardSignupEmail({ data: { email: email.trim() } });
        if (gate && gate.ok === false) {
          return {
            ok: false,
            errorKey: gate.errorKey || "authDisposableEmail",
          };
        }
      } catch (err) {
        // If the gate is unreachable, still run a client-side live check.
        console.error("guardSignupEmail", err);
        const live = await checkDisposableEmail(email);
        if (live.disposable) {
          return { ok: false, errorKey: "authDisposableEmail" };
        }
      }
      const trimmedName = name.trim();
      if (!trimmedName) return { ok: false, errorKey: "authNameRequired" };
      if (looksLikeEmailAddress(trimmedName)) {
        return { ok: false, errorKey: "authNameNotEmail" };
      }
      const supabase = getSupabaseBrowserClient();
      const callback = authCallbackUrl();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // handle_new_user() reads these from raw_user_meta_data.
          data: {
            display_name: trimmedName,
            birth_date: birthDate || null,
            marketing_opt_in: marketingOptIn ? "true" : "false",
          },
          // verify=1 so /auth/callback can set profiles.email_verified only after a real click.
          emailRedirectTo: callback ? `${callback}?verify=1` : undefined,
        },
      });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };

      // Supabase anti-enumeration: existing emails often return a user with
      // empty identities and no error, treat that as "already registered".
      const identities = data.user?.identities ?? [];
      if (data.user && identities.length === 0) {
        return { ok: false, errorKey: "authEmailTaken" };
      }

      // Prefer an immediate session. If Confirm-email blocked the session,
      // sign in now (DB trigger confirms auth.users for login; Settings
      // still shows unverified until they open a verify link).
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          return {
            ok: false,
            errorKey: authErrorKey(signInError.code, signInError.message),
            errorDetail: signInError.message,
          };
        }
      }

      return { ok: true, softVerifyHint: true };
    },
    [notConfigured, opsFlags.signupsEnabled],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };
      return { ok: true };
    },
    [notConfigured],
  );

  const signInWithOAuth = useCallback(
    async (provider: "google" | "facebook"): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authCallbackUrl(),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
          skipBrowserRedirect: false,
        },
      });
      if (error)
        return {
          ok: false,
          errorKey: "authOAuthFailed",
          errorDetail: error.message,
        };
      return { ok: true };
    },
    [notConfigured],
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await getSupabaseBrowserClient().auth.signOut();
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };
      return { ok: true };
    },
    [notConfigured],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      const { error } = await getSupabaseBrowserClient().auth.updateUser({
        password,
      });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };
      return { ok: true };
    },
    [notConfigured],
  );

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return notConfigured();
      const addr = session?.user.email;
      if (!addr) return { ok: false, errorKey: "authInvalidCreds" };
      if (nextPassword.length < 8) return { ok: false, errorKey: "authWeakPassword" };

      const supabase = getSupabaseBrowserClient();
      // Prove they know the current password before rotating it.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: addr,
        password: currentPassword,
      });
      if (verifyError)
        return {
          ok: false,
          errorKey: "authWrongPassword",
          errorDetail: verifyError.message,
        };

      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };
      return { ok: true };
    },
    [session, notConfigured],
  );

  const saveProfile = useCallback(
    async (p: Partial<Omit<UserProfile, "registered">>): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();

      // Onboarding finish goes through a DEFINER RPC so a missing profile row
      // (slow auth trigger) cannot silently "succeed" and bounce step 1 forever.
      if (p.interests !== undefined || p.hobbies !== undefined || p.cosmicVibe !== undefined) {
        const { data, error } = await getSupabaseBrowserClient().rpc("complete_onboarding", {
          p_interests: p.interests ?? profileRow?.interests ?? [],
          p_hobbies: p.hobbies ?? profileRow?.hobbies ?? [],
          p_cosmic_vibe: p.cosmicVibe ?? profileRow?.cosmic_vibe ?? null,
          p_lang: prefs.lang ?? "ka",
        });
        if (error) return { ok: false, errorDetail: error.message };
        if (!data) return { ok: false, errorDetail: "Could not save profile." };
        setProfileRow(data as ProfileRow);
        return { ok: true };
      }

      const { data, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .update({
          ...(p.name !== undefined ? { display_name: p.name } : {}),
          ...(p.birthDate !== undefined ? { birth_date: p.birthDate || null } : {}),
          lang: prefs.lang,
        })
        .eq("id", userId)
        .select("*")
        .maybeSingle();

      if (error) return { ok: false, errorDetail: error.message };
      if (!data) return { ok: false, errorDetail: "Could not save profile." };
      setProfileRow(data);
      return { ok: true };
    },
    [userId, prefs.lang, notConfigured, profileRow],
  );

  const updateDisplayName = useCallback(
    async (name: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, errorKey: "authNameRequired" };
      if (looksLikeEmailAddress(trimmed)) {
        return { ok: false, errorKey: "authNameNotEmail" };
      }

      const { data, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", userId)
        .select("*")
        .maybeSingle();

      if (error) return { ok: false, errorDetail: error.message };
      if (!data) return { ok: false, errorDetail: "Could not save profile." };
      setProfileRow(data);
      return { ok: true };
    },
    [userId, notConfigured],
  );

  const updateEmail = useCallback(
    async (nextEmail: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();
      const trimmed = nextEmail.trim().toLowerCase();
      if (!trimmed.includes("@")) return { ok: false, errorKey: "authEmailInvalid" };
      if (isDisposableEmail(trimmed)) {
        return { ok: false, errorKey: "authDisposableEmail" };
      }
      try {
        const gate = await guardSignupEmail({ data: { email: trimmed } });
        if (gate && gate.ok === false) {
          return {
            ok: false,
            errorKey: gate.errorKey || "authDisposableEmail",
          };
        }
      } catch (err) {
        console.error("guardSignupEmail", err);
        const live = await checkDisposableEmail(trimmed);
        if (live.disposable) {
          return { ok: false, errorKey: "authDisposableEmail" };
        }
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        email: trimmed,
      });
      if (error)
        return {
          ok: false,
          errorKey: authErrorKey(error.code, error.message),
          errorDetail: error.message,
        };
      // New address is unconfirmed until they open the change-email link.
      await supabase.rpc("mark_email_unverified");
      await loadUserData(userId);
      // Supabase emails a confirmation link; the session email stays old until confirmed.
      return { ok: true };
    },
    [userId, notConfigured],
  );

  const resendEmailVerification = useCallback(async (): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !userId) return notConfigured();
    const address = session?.user.email;
    if (!address) return { ok: false, errorKey: "authEmailInvalid" };
    const base = authCallbackUrl();
    const redirectTo = base ? `${base}?verify=1` : undefined;
    const supabase = getSupabaseBrowserClient();

    // Prefer signup resend (does not disrupt the current session). Fall back to OTP.
    let error =
      (
        await supabase.auth.resend({
          type: "signup",
          email: address,
          options: { emailRedirectTo: redirectTo },
        })
      ).error ?? null;

    if (error) {
      const otp = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectTo,
        },
      });
      error = otp.error;
    }

    if (error)
      return {
        ok: false,
        errorKey: authErrorKey(error.code, error.message),
        errorDetail: error.message,
      };

    // Persist “waiting” in the profile so Settings cannot snap back to Send.
    const sentAt = new Date().toISOString();
    const { data: updated, error: profileError } = await supabase
      .from("profiles")
      .update({ email_verify_sent_at: sentAt })
      .eq("id", userId)
      .select("*")
      .maybeSingle();
    if (!profileError && updated) setProfileRow(updated);
    else {
      setProfileRow((prev) => (prev ? { ...prev, email_verify_sent_at: sentAt } : prev));
    }

    try {
      localStorage.setItem("mkitxavi_email_verify_pending", "1");
    } catch {
      /* ignore */
    }

    return { ok: true };
  }, [session, userId, notConfigured]);

  const updateAvatar = useCallback(
    async (file: File): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();
      if (!file.type.startsWith("image/")) return { ok: false, errorKey: "avatarInvalidType" };
      if (file.size > 2 * 1024 * 1024) return { ok: false, errorKey: "avatarTooLarge" };

      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "jpg";
      const path = `${userId}/avatar.${ext}`;
      const supabase = getSupabaseBrowserClient();

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (uploadError) return { ok: false, errorDetail: uploadError.message };

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust CDN/browser cache after replace.
      const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId)
        .select("*")
        .maybeSingle();

      if (error) return { ok: false, errorDetail: error.message };
      if (!data) return { ok: false, errorDetail: "Could not save profile." };
      setProfileRow(data);
      return { ok: true };
    },
    [userId, notConfigured],
  );

  const spendEnergy = useCallback(
    async (n: number): Promise<boolean> => {
      if (!isSupabaseConfigured || !userId) return false;
      if (energyUnlimited) return true;

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("spend_energy", { amount: n });
      if (error) return false;
      if (typeof data === "number") setEnergy(data);
      return true;
    },
    [userId, energyUnlimited],
  );

  const applyEnergy = useCallback((balance: number) => {
    setEnergy(Math.max(0, balance));
  }, []);

  // Claim calendar-day free energy when the tab becomes visible again (e.g. after midnight).
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.rpc("claim_daily_energy");
        if (typeof data === "number") setEnergy(data);
        else await loadUserData(userId);
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, loadUserData]);

  const beginAdWatchSession = useCallback(
    async (
      source: "overlay" | "gam" | "simulate",
    ): Promise<
      | { ok: true; ticket: string; minWatchSeconds: number }
      | { ok: false; errorKey?: string; errorDetail?: string }
    > => {
      if (!isSupabaseConfigured || !userId) {
        return { ok: false as const, errorKey: "authNotConfigured" };
      }
      if (!opsFlags.adsEnabled) {
        return { ok: false as const, errorDetail: "Ad rewards are temporarily disabled." };
      }
      const {
        data: { session },
      } = await getSupabaseBrowserClient().auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return { ok: false as const, errorKey: "authRequired" };

      const { beginAdWatch } = await import("@/lib/ad-energy");
      const result = await beginAdWatch({ data: { accessToken, source } });
      if (!result.ok) {
        if (result.error === "daily_limit") return { ok: false, errorKey: "adLimitReached" };
        if (result.error === "ads_disabled") {
          return { ok: false, errorDetail: "Ad rewards are temporarily disabled." };
        }
        return { ok: false, errorKey: "adFailed" };
      }
      return {
        ok: true,
        ticket: result.ticket,
        minWatchSeconds: result.minWatchSeconds,
      };
    },
    [userId, notConfigured, opsFlags.adsEnabled],
  );

  const claimAdEnergy = useCallback(
    async (ticket: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();
      if (!opsFlags.adsEnabled) {
        return { ok: false, errorDetail: "Ad rewards are temporarily disabled." };
      }
      if (!ticket || ticket.length < 32) return { ok: false, errorKey: "adFailed" };

      const {
        data: { session },
      } = await getSupabaseBrowserClient().auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return { ok: false, errorKey: "authRequired" };

      const { claimAdEnergyFn } = await import("@/lib/ad-energy");
      const result = await claimAdEnergyFn({ data: { accessToken, ticket } });
      if (!result.ok) {
        if (result.error === "daily_limit") return { ok: false, errorKey: "adLimitReached" };
        if (result.error === "watch_not_finished") return { ok: false, errorKey: "adFailed" };
        if (result.error === "ads_disabled") {
          return { ok: false, errorDetail: "Ad rewards are temporarily disabled." };
        }
        return { ok: false, errorKey: "adFailed" };
      }
      setEnergy(result.energy);
      setAdsClaimedToday((n) => n + 1);
      return { ok: true };
    },
    [userId, notConfigured, opsFlags.adsEnabled],
  );

  const claimStreakReward = useCallback(
    async (milestone: number): Promise<AuthResult> => {
      if (!isSupabaseConfigured || !userId) return notConfigured();
      const { data, error } = await getSupabaseBrowserClient().rpc("claim_streak_reward", {
        milestone,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("already claimed")) return { ok: false, errorKey: "streakAlreadyClaimed" };
        if (msg.includes("streak too low")) return { ok: false, errorKey: "streakTooLow" };
        return { ok: false, errorDetail: error.message };
      }
      if (typeof data === "number") setEnergy(data);
      setProfileRow((prev) =>
        prev
          ? {
              ...prev,
              streak_rewards_claimed: Array.from(
                new Set([...(prev.streak_rewards_claimed ?? []), milestone]),
              ),
            }
          : prev,
      );
      return { ok: true };
    },
    [userId, notConfigured],
  );

  // Prefer durable profile value; fall back to device storage (incl. guests).
  const [personalityLocal, setPersonalityLocal] = useState<ArchetypeKey | null>(null);

  useEffect(() => {
    setPersonalityLocal(loadPersonalityLocal(userId));
  }, [userId]);

  const personalityArchetype = useMemo<ArchetypeKey | null>(() => {
    const fromProfile = profileRow?.personality_archetype;
    if (isArchetypeKey(fromProfile)) return fromProfile;
    if (isArchetypeKey(personalityLocal)) return personalityLocal;
    return loadPersonalityLocal(userId);
  }, [profileRow?.personality_archetype, personalityLocal, userId]);

  // One-time migrate: signed-in user with local result but empty profile column.
  const migratedPersonality = useRef<string | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !profileLoaded || !profileRow) return;
    if (isArchetypeKey(profileRow.personality_archetype)) {
      savePersonalityLocal(userId, profileRow.personality_archetype);
      setPersonalityLocal(profileRow.personality_archetype);
      return;
    }
    if (migratedPersonality.current === userId) return;
    const local = loadPersonalityLocal(userId);
    if (!local) return;
    migratedPersonality.current = userId;
    void getSupabaseBrowserClient()
      .from("profiles")
      .update({ personality_archetype: local })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) {
          migratedPersonality.current = null;
          return;
        }
        setProfileRow((prev) => (prev ? { ...prev, personality_archetype: local } : prev));
        setPersonalityLocal(local);
      });
  }, [userId, profileLoaded, profileRow]);

  const savePersonalityArchetype = useCallback(
    async (key: ArchetypeKey) => {
      savePersonalityLocal(userId, key);
      setPersonalityLocal(key);
      if (!isSupabaseConfigured || !userId) return;
      const { error } = await getSupabaseBrowserClient()
        .from("profiles")
        .update({ personality_archetype: key })
        .eq("id", userId);
      if (!error) {
        setProfileRow((prev) => (prev ? { ...prev, personality_archetype: key } : prev));
      }
    },
    [userId],
  );

  const clearPersonalityArchetype = useCallback(async () => {
    clearPersonalityLocal(userId);
    setPersonalityLocal(null);
    if (!isSupabaseConfigured || !userId) {
      setProfileRow((prev) => (prev ? { ...prev, personality_archetype: null } : prev));
      return;
    }
    const { error } = await getSupabaseBrowserClient()
      .from("profiles")
      .update({ personality_archetype: null })
      .eq("id", userId);
    if (!error) {
      setProfileRow((prev) => (prev ? { ...prev, personality_archetype: null } : prev));
    }
  }, [userId]);

  const user = useMemo(() => profileFromRow(profileRow), [profileRow]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      authStatus,
      authenticated: authStatus === "signed-in",
      email: session?.user.email ?? null,
      emailVerified: Boolean(profileRow?.email_verified),
      emailVerifyPending:
        !profileRow?.email_verified &&
        Boolean(
          profileRow?.email_verify_sent_at ||
          (typeof window !== "undefined" &&
            window.localStorage?.getItem("mkitxavi_email_verify_pending") === "1"),
        ),
      profileLoaded,

      lang: prefs.lang,
      seenPortal: prefs.seenPortal,
      muted: prefs.muted,
      energy,
      energyUnlimited,
      nextFreeRefillAt,
      adsClaimedToday,
      sub,
      subPlan,
      isComp,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      whopManageUrl,
      refreshWallet,
      accountBanned: Boolean(profileRow?.banned),
      banReason: profileRow?.ban_reason ?? null,
      accountRestricted: Boolean(profileRow?.chat_restricted),
      opsFlags,
      opsAnnouncements,
      refreshOpsRuntime,
      user,
      streak: profileRow?.streak ?? 0,
      bestStreak: profileRow?.best_streak ?? 0,
      lastVisit: profileRow?.last_visit ?? "",
      streakRewardsClaimed: profileRow?.streak_rewards_claimed ?? [],
      personalityArchetype,
      savePersonalityArchetype,
      clearPersonalityArchetype,

      t,
      setLang,
      setMuted,
      markPortalSeen,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      requestPasswordReset,
      updatePassword,
      changePassword,
      saveProfile,
      updateDisplayName,
      updateEmail,
      resendEmailVerification,
      updateAvatar,
      spendEnergy,
      applyEnergy,
      claimAdEnergy,
      beginAdWatch: beginAdWatchSession,
      claimStreakReward,
    }),
    [
      ready,
      authStatus,
      session,
      profileLoaded,
      prefs,
      energy,
      energyUnlimited,
      nextFreeRefillAt,
      adsClaimedToday,
      sub,
      subPlan,
      isComp,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      whopManageUrl,
      refreshWallet,
      profileRow,
      opsFlags,
      opsAnnouncements,
      refreshOpsRuntime,
      user,
      t,
      setLang,
      setMuted,
      markPortalSeen,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      requestPasswordReset,
      updatePassword,
      changePassword,
      saveProfile,
      updateDisplayName,
      updateEmail,
      resendEmailVerification,
      updateAvatar,
      spendEnergy,
      applyEnergy,
      claimAdEnergy,
      beginAdWatchSession,
      claimStreakReward,
      personalityArchetype,
      savePersonalityArchetype,
      clearPersonalityArchetype,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
