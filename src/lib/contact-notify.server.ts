type ContactNotifyInput = {
  kind: "support" | "feedback";
  name: string;
  email: string;
  message: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Email inbox for support/feedback alerts. */
export function contactNotifyTo(): string {
  return process.env.CONTACT_NOTIFY_TO?.trim() || "";
}

export function contactNotifyFrom(): string {
  return process.env.CONTACT_FROM?.trim() || "Mkitxavi <onboarding@resend.dev>";
}

async function notifyViaResend(
  input: ContactNotifyInput,
  apiKey: string,
): Promise<{ ok: boolean; detail?: string }> {
  const to = contactNotifyTo();
  const from = contactNotifyFrom();
  const label = input.kind === "support" ? "Support" : "Feedback";
  const subject = `[Mkitxavi ${label}] ${input.name} <${input.email}>`;
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <p style="margin:0 0 12px"><strong>New ${label.toLowerCase()} message</strong> from mkitxavi.com</p>
      <p style="margin:0 0 4px"><strong>Name:</strong> ${safeName}</p>
      <p style="margin:0 0 4px"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
      <p style="margin:0 0 12px"><strong>Kind:</strong> ${label}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/>
      <p style="white-space:pre-wrap;margin:0">${safeMessage}</p>
    </div>
  `.trim();

  const text = [
    `New ${label.toLowerCase()} message from mkitxavi.com`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Kind: ${label}`,
    "",
    input.message,
  ].join("\n");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("contact notify resend error", error);
    return { ok: false, detail: error.message };
  }

  return { ok: true, detail: data?.id };
}

/**
 * Zero-config email bridge (FormSubmit). First delivery sends an activation
 * mail to the inbox — click Activate, then all later messages arrive normally.
 */
async function notifyViaFormSubmit(
  input: ContactNotifyInput,
): Promise<{ ok: boolean; detail?: string }> {
  const to = contactNotifyTo();
  const label = input.kind === "support" ? "Support" : "Feedback";
  const subject = `[Mkitxavi ${label}] ${input.name}`;

  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      kind: label,
      message: input.message,
      _subject: subject,
      _replyto: input.email,
      _template: "table",
      _captcha: "false",
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    success?: string | boolean;
    message?: string;
    error?: string;
  } | null;

  if (!res.ok) {
    const detail = body?.message || body?.error || `HTTP ${res.status}`;
    console.error("contact notify formsubmit error", detail);
    return { ok: false, detail };
  }

  return { ok: true, detail: typeof body?.success === "string" ? body.success : "formsubmit" };
}

/**
 * Notify the operator inbox that a contact form was submitted.
 * Prefer Resend when RESEND_API_KEY is set; otherwise FormSubmit sends to the configured inbox.
 * Failures are logged; callers should not block the user-facing success path.
 */
export async function notifyContactInbox(input: ContactNotifyInput): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    if (!contactNotifyTo()) return { ok: false, detail: "Contact email is not configured." };
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey) return await notifyViaResend(input, apiKey);
    return await notifyViaFormSubmit(input);
  } catch (err) {
    console.error("contact notify failed", err);
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "notify failed",
    };
  }
}
