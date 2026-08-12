import type { APIRoute } from "astro";
import { getDb, ensureSchema, normalizeEmail, isValidEmail } from "../../lib/db";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendVoteEmail(to: string, nombre: string, votarUrl: string): Promise<boolean> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = import.meta.env.EMAIL_FROM ?? "Renace <onboarding@resend.dev>";
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
      subject: "Renace: vota por el dia de la reunion con los ingenieros",
      html: `<p>Hola ${nombre},</p>
<p>Ya estas en modo reconstruccion. El siguiente paso es escoger, entre todos, el dia habil de la reunion con el equipo de ingenieros.</p>
<p><a href="${votarUrl}">Vota aqui por el dia que mas te sirva</a></p>
<p>Cada correo puede votar una sola vez. El dia mas votado sera el de la reunion.</p>
<p>Equipo Renace</p>`,
    }),
  });
  return res.ok;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud invalida." }, 400);
  }

  const nombre = (body.nombre ?? "").trim();
  const email = normalizeEmail(body.email ?? "");
  if (!nombre || !isValidEmail(email)) {
    return json({ error: "Ingresa tu nombre y un correo valido." }, 400);
  }

  try {
    const db = getDb();
    await ensureSchema(db);
    // Idempotent registration: re-submitting with the same email just refreshes the name.
    await db.execute({
      sql: `INSERT INTO solicitudes (nombre, email) VALUES (?, ?)
            ON CONFLICT(email) DO UPDATE SET nombre = excluded.nombre`,
      args: [nombre, email],
    });

    const votarUrl = new URL("/votar", request.url).toString();
    let enviado = false;
    try {
      enviado = await sendVoteEmail(email, nombre, votarUrl);
    } catch (error) {
      console.error("email send failed:", error);
    }

    return json({ enviado, votarUrl: "/votar" });
  } catch (error) {
    console.error("reconstruccion endpoint error:", error);
    return json({ error: "No pudimos registrar tu solicitud. Intenta de nuevo." }, 500);
  }
};
