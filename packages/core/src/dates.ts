/** Calendar days travel as "YYYY-MM-DD" and months as "YYYY-MM"; both are Europe/Prague days. */

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(now);
}

export function currentMonth(now = new Date()): string {
  return todayISO(now).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "Říjen 2026" in the nominative, which Intl gets wrong for Czech ("října 2026"). */
const czechMonths = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];
const slovakMonths = [
  'Január',
  'Február',
  'Marec',
  'Apríl',
  'Máj',
  'Jún',
  'Júl',
  'August',
  'September',
  'Október',
  'November',
  'December',
];

const englishMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const months = { cs: czechMonths, sk: slovakMonths, en: englishMonths };

export function monthName(month: string, locale: 'cs' | 'sk' | 'en'): string {
  const [y, m] = month.split('-').map(Number);
  return `${months[locale][m - 1]} ${y}`;
}

const czechShort = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];
const slovakShort = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
const englishShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shortMonths = { cs: czechShort, sk: slovakShort, en: englishShort };

export function shortMonth(month: string, locale: 'cs' | 'sk' | 'en'): string {
  return shortMonths[locale][Number(month.slice(5, 7)) - 1];
}

export function dayLabel(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

export function shiftDay(iso: string, by: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
}
