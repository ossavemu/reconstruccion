import type { APIRoute } from "astro";
import { getDb, ensureSchema, normalizeEmail, isValidEmail } from "../../lib/db";
import { nextBusinessDays } from "../../lib/agenda";

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

  const email = normalizeEmail(body.email ?? "");
  const fecha = (body.fecha ?? "").trim();
  const franja = (body.franja ?? "").trim();

  if (!isValidEmail(email)) {
    return json({ error: "Ingrese un correo valido." }, 400);
  }
  if (!nextBusinessDays(5).includes(fecha)) {
    return json({ error: "Escoja uno de los dias disponibles." }, 400);
  }
  if (franja !== "manana" && franja !== "tarde") {
    return json({ error: "Escoja una franja horaria." }, 400);
  }

  try {
    const db = getDb();
    await ensureSchema(db);

    // Only registered survivors (modo reconstruccion) can vote.
    const registered = await db.execute({
      sql: "SELECT 1 FROM solicitudes WHERE email = ?",
      args: [email],
    });
    if (registered.rows.length === 0) {
      return json(
        {
          error:
            "Este correo no esta registrado. Registrese primero en modo reconstruccion.",
        },
        403,
      );
    }

    try {
      await db.execute({
        sql: "INSERT INTO votos (email, fecha, franja) VALUES (?, ?, ?)",
        args: [email, fecha, franja],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("UNIQUE")) {
        return json({ error: "Este correo ya registro un voto." }, 409);
      }
      throw error;
    }

    return json({ ok: true, fecha, franja });
  } catch (error) {
    console.error("votar endpoint error:", error);
    return json({ error: "No pudimos registrar su voto. Intente de nuevo." }, 500);
  }
};
