// Escapes user-provided text before embedding it in email HTML.
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Minimal Resend wrapper shared by the API endpoints.
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = import.meta.env.EMAIL_FROM ?? "Reunion de reconstruccion <onboarding@resend.dev>";
  const replyTo = import.meta.env.EMAIL_REPLY_TO;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      ...(replyTo ? { reply_to: [replyTo] } : {}),
      to: [to],
      subject,
      html,
    }),
  });
  return res.ok;
}

// Notifies the organizer inbox; failures are logged by the caller and never
// block the main flow.
export async function notifyAdmin(subject: string, html: string): Promise<boolean> {
  const admin = import.meta.env.ADMIN_EMAIL;
  if (!admin) return false;
  return sendEmail({ to: admin, subject, html });
}
