import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type PersistedChatMessage = {
  id: number;
  role: "user" | "nina";
  text: string;
  cards?: unknown;
  imageUrl?: string;
  showOffers?: boolean;
  /** ISO timestamp when the message was created (ops + history). */
  createdAt?: string;
};

export type PersistedChat = {
  messages: PersistedChatMessage[];
  service?: string | null;
  updatedAt?: string;
};

export async function loadCloudChat(): Promise<PersistedChat | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb
      .from("chat_state")
      .select("messages, service, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    const messages = Array.isArray(data.messages) ? (data.messages as PersistedChatMessage[]) : [];
    if (!messages.length) return null;
    return {
      messages,
      service: data.service,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function saveCloudChat(chat: PersistedChat): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("chat_state").upsert(
      {
        user_id: user.id,
        messages: chat.messages,
        service: chat.service ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* offline / RLS */
  }
}
