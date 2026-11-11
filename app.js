// Gedeelde helpers voor de aanmeld-, scherm- en beheerpagina.

const TZ = 'Europe/Amsterdam';

async function rpc(fn, args = {}) {
  let res;
  try {
    res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CONFIG.supabaseKey },
      body: JSON.stringify(args),
    });
  } catch {
    const err = new Error('Geen verbinding. Controleer je internet en probeer het opnieuw.');
    err.offline = true;
    throw err;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || 'Er ging iets mis. Probeer het opnieuw.');
    err.hint = data?.hint;
    throw err;
  }
  return data;
}

// ---- datums (altijd in Nederlandse tijd, ongeacht het apparaat)

const fmtTime = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fmtDayLong = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const fmtDayShort = new Intl.DateTimeFormat('nl-NL', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const fmtKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

// 'YYYY-MM-DD' van een moment, in Nederlandse tijd
function dayKey(d) {
  return fmtKey.format(new Date(d));
}

function todayKey() {
  return dayKey(Date.now());
}

function addDays(key, n) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function timeOf(iso) {
  return fmtTime.format(new Date(iso));
}

function timeRange(shift) {
  return `${timeOf(shift.starts_at)} – ${timeOf(shift.ends_at)}`;
}

function dayLabel(key, { short = false, relative = true } = {}) {
  const d = new Date(`${key}T12:00:00Z`);
  const text = (short ? fmtDayShort : fmtDayLong).format(d);
  if (relative) {
    const t = todayKey();
    if (key === t) return `Vandaag · ${text}`;
    if (key === addDays(t, 1)) return `Morgen · ${text}`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function groupByDay(shifts) {
  const map = new Map();
  for (const s of shifts) {
    const k = dayKey(s.starts_at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return map;
}

// ---- overig

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function store(storage, key, value) {
  try {
    if (value === undefined) return storage.getItem(key);
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    return null;
  }
}

let toastTimer;
function toast(message, type = 'ok') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), type === 'error' ? 6000 : 3000);
}
