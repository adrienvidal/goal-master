/** A calendar day in Europe/Paris, formatted YYYY-MM-DD. */
export type Day = string;

const parisFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function parisDay(date: Date): Day {
  return parisFormatter.format(date);
}

/** Days are handled as UTC noon so clock changes never shift them. */
function toNoon(day: Day): Date {
  return new Date(`${day}T12:00:00Z`);
}

export function addDays(day: Day, n: number): Day {
  const d = toNoon(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isWorkday(day: Day): boolean {
  const weekday = toNoon(day).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

export function dayRange(from: Day, to: Day): Day[] {
  const days: Day[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
