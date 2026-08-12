const BOGOTA = "America/Bogota";
const DAY_MS = 24 * 60 * 60 * 1000;

// Voting window; only weekdays (Monday to Friday) are eligible.
const VOTING_START = "2026-08-13";
const VOTING_END = "2026-08-28";

// Returns the YYYY-MM-DD string for a date in Colombia's timezone.
function bogotaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(date);
}

function isWeekend(dateString: string): boolean {
  const day = new Date(`${dateString}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

// Every business day from VOTING_START through VOTING_END, inclusive.
export function votingWeekDays(): string[] {
  const days: string[] = [];
  let cursor = Date.parse(`${VOTING_START}T12:00:00Z`);
  const end = Date.parse(`${VOTING_END}T12:00:00Z`);
  while (cursor <= end) {
    const dateString = bogotaDateString(new Date(cursor));
    if (!isWeekend(dateString)) days.push(dateString);
    cursor += DAY_MS;
  }
  return days;
}
