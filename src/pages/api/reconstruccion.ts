import type { APIRoute } from "astro";
import { getDb, ensureSchema, normalizeEmail, isValidEmail } from "../../lib/db";
import { sendEmail, notifyAdmin, escapeHtml } from "../../lib/email";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
    return json({ error: "Ingrese su nombre y un correo valido." }, 400);
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
      enviado = await sendEmail({
        to: email,
        subject: "Vote por el dia de la reunion con los ingenieros",
        html: `<p>Hola ${escapeHtml(nombre)},</p>
<p>Su registro en modo reconstruccion fue confirmado. El siguiente paso es definir, por votacion, el dia habil de la reunion con el equipo de ingenieros voluntarios.</p>
<p><a href="${votarUrl}">Vote aqui por el dia que mas le convenga</a></p>
<p>Cada correo puede votar una sola vez. El dia mas votado sera el de la reunion.</p>
<p>Equipo de la iniciativa de reconstruccion</p>`,
      });
    } catch (error) {
      console.error("email send failed:", error);
    }

    try {
      await notifyAdmin(
        "Nuevo registro en modo reconstruccion",
        `<p>Se registro una nueva persona:</p>
<p><strong>${escapeHtml(nombre)}</strong> &lt;${escapeHtml(email)}&gt;</p>
<p>Correo de votacion entregado: ${enviado ? "si" : "no (revisar dominio verificado en Resend)"}</p>`,
      );
    } catch (error) {
      console.error("admin notification failed:", error);
    }

    return json({ enviado, votarUrl: "/votar" });
  } catch (error) {
    console.error("reconstruccion endpoint error:", error);
    return json({ error: "No pudimos registrar su solicitud. Intente de nuevo." }, 500);
  }
};
