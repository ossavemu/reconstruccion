import type { APIRoute } from "astro";
import { getDb, ensureSchema } from "../../lib/db";
import { nextBusinessDays } from "../../lib/agenda";

export const prerender = false;

// Returns the candidate business days and the current vote tally for each.
export const GET: APIRoute = async () => {
  try {
    const db = getDb();
    await ensureSchema(db);

    const dias = nextBusinessDays(5);
    const placeholders = dias.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `SELECT fecha, COUNT(*) AS votos FROM votos WHERE fecha IN (${placeholders}) GROUP BY fecha`,
      args: dias,
    });

    const tally = new Map<string, number>();
    for (const row of result.rows) {
      tally.set(String(row.fecha), Number(row.votos));
    }

    const opciones = dias.map((fecha) => ({
      fecha,
      votos: tally.get(fecha) ?? 0,
    }));

    return new Response(JSON.stringify({ opciones }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("votacion endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "No pudimos cargar la votacion." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
