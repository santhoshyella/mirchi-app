/**
 * Indian numbering system (lakh / crore separators).
 * 100000 → "1,00,000"
 */
export function fmtIN(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-IN");
}

export function fmtKG(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return `${fmtIN(n)} KG`;
}

export function fmtINR(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return `₹${fmtIN(n)}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** "04-Jun-15:11" — purchase row header stamp: date from one field, time from another. */
export function fmtDateTimeStamp(date: Date | string, time: Date | string | undefined | null): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.toLocaleDateString("en-IN", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  if (!time) return `${day}-${mon}`;
  const t = typeof time === "string" ? new Date(time) : time;
  const hhmm = t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}-${mon}-${hhmm}`;
}

/** "14 Jun · 14:32" — compact date + time for note timestamps. */
export function fmtDateTime(d: Date | string | undefined | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const datePart = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const timePart = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datePart.replace(" ", "-")}-${timePart}`;
}

export function fmtLongDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compact relative time — "just now", "5m ago", "3h ago", "2d ago".
 * Used to show how long an item has been sitting at its current stage.
 */
export function fmtRelTime(d: Date | string | undefined | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 30) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/** "14:32" — local 24h clock for stage entry stamps. */
export function fmtTime(d: Date | string | undefined | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Whole-day count from today (midnight) until the given ISO date.
 * Positive → in the future, 0 → today, negative → overdue.
 * Compares date-only (no clock skew) so "today" is consistent across the day.
 */
export function daysUntil(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = t.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Friendly dispatch-deadline phrase used in pills.
 *  - 0  → "today"
 *  - 1  → "tomorrow"
 *  - >0 → "in Nd"
 *  - <0 → "Nd overdue"
 */
export function fmtDeadline(iso: string | undefined | null): string {
  const d = daysUntil(iso);
  if (d === null) return "—";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d > 0) return `in ${d}d`;
  return `${Math.abs(d)}d overdue`;
}


/**
 * Shorten a prefixed ID for display.
 * "p-a1b2c3d4-..." → "p-a1b"
 * "d-a1b2c3d4-..." → "d-a1b"
 * "r-a1b2c3d4-..." → "r-a1b"
 */
export function fmtId(id: string): string {
  const dash = id.indexOf("-");
  if (dash === -1) return id.slice(0, 6);
  const prefix = id.slice(0, dash + 1); // "p-"
  const rest = id.slice(dash + 1).replace(/-/g, "");
  return prefix + rest.slice(0, 3);
}
