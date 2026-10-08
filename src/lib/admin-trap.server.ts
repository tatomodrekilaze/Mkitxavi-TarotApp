type IntrusionPayload = {
  password: string;
  email: string | null;
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  coords: string;
  userAgent: string;
  dump: string;
};

function webhookUrl(): string {
  return process.env.DISCORD_ADMIN_WEBHOOK?.trim() || "";
}

function clip(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function postAdminIntrusion(payload: IntrusionPayload): Promise<void> {
  const url = webhookUrl();
  if (!url) return;

  const fields = [
    { name: "IP", value: clip(payload.ip || "unknown", 1024), inline: true },
    { name: "Country", value: clip(payload.country || "unknown", 1024), inline: true },
    { name: "City", value: clip(payload.city || "unknown", 1024), inline: true },
    { name: "Region", value: clip(payload.region || "unknown", 1024), inline: true },
    { name: "ISP", value: clip(payload.isp || "unknown", 1024), inline: true },
    { name: "Coords", value: clip(payload.coords || "unknown", 1024), inline: true },
    {
      name: "Signed-in email",
      value: clip(payload.email || "none / not signed in", 1024),
      inline: false,
    },
    {
      name: "Password used",
      value: clip(`\`${payload.password || "?"}\``, 1024),
      inline: false,
    },
    {
      name: "User-Agent",
      value: clip(payload.userAgent || "unknown", 1024),
      inline: false,
    },
  ];

  const body = {
    username: "Admin Trap",
    embeds: [
      {
        title: "ADMIN PANEL BREACH",
        description: "Someone entered the honeypot admin panel.",
        color: 0xcc0000,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const dump = clip(payload.dump || "", 1800);
  if (dump) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Admin Trap",
        content: `\`\`\`\n${dump}\n\`\`\``,
      }),
    });
  }
}
