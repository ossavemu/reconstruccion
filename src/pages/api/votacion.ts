import type { APIRoute } from "astro";
import { getDb, ensureSchema } from "../../lib/db";
import { votingWeekDays } from "../../lib/agenda";

export const prerender = false;

// Returns the candidate business days with the public vote tally per day
// and per time slot (manana / tarde, i.e. after 5 pm).
export const GET: APIRoute = async () => {
  try {
    const db = getDb();
    await ensureSchema(db);

    const dias = votingWeekDays();
    const placeholders = dias.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `SELECT fecha, franja, COUNT(*) AS votos
            FROM votos WHERE fecha IN (${placeholders})
            GROUP BY fecha, franja`,
      args: dias,
    });

    const tally = new Map<string, { manana: number; tarde: number }>();
    for (const row of result.rows) {
      const fecha = String(row.fecha);
      const entry = tally.get(fecha) ?? { manana: 0, tarde: 0 };
      if (String(row.franja) === "tarde") entry.tarde += Number(row.votos);
      else entry.manana += Number(row.votos);
      tally.set(fecha, entry);
    }

    const opciones = dias.map((fecha) => {
      const entry = tally.get(fecha) ?? { manana: 0, tarde: 0 };
      return {
        fecha,
        manana: entry.manana,
        tarde: entry.tarde,
        votos: entry.manana + entry.tarde,
      };
    });

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
