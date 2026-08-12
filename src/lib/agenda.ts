const BOGOTA = "America/Bogota";
const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the YYYY-MM-DD string for a date in Colombia's timezone.
function bogotaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(date);
}

function isWeekend(dateString: string): boolean {
  const day = new Date(`${dateString}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

// Next `count` business days in Colombia, starting tomorrow.
export function nextBusinessDays(count = 5): string[] {
  const days: string[] = [];
  let cursor = Date.now() + DAY_MS;
  while (days.length < count) {
    const dateString = bogotaDateString(new Date(cursor));
    if (!isWeekend(dateString)) days.push(dateString);
    cursor += DAY_MS;
  }
  return days;
}
