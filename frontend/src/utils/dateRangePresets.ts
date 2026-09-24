export type DateRangeInput = { start: string; end: string };

export const pad = (value: number) => value.toString().padStart(2, "0");

export const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Saturday–Sunday of the current (or upcoming) weekend, relative to `now` — shared by the home
// page's "Ce week-end" filter preset and the evergreen /agenda/ce-week-end landing page (issue
// #56), so both mean exactly the same dates.
export const getWeekendRange = (now: Date): DateRangeInput => {
  const day = now.getDay();
  const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
  return { start: formatDateInput(saturday), end: formatDateInput(sunday) };
};
