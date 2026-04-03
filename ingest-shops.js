#!/usr/bin/env node
/**
 * ShieldFinder shop data ingestion script.
 *
 * Usage:
 *   node ingest-shops.js --input <file.csv> [--dry-run]
 *   node ingest-shops.js --input "C:/path/a.csv,C:/path/b.csv" [--dry-run]
 *
 * Reads one or more Outscraper CSV files, normalizes them to the ShieldFinder
 * shops.js schema, deduplicates against existing data, and writes back.
 *
 * ShieldFinder schema:
 *   i   — slug id (string)       e.g. "sf-shop-name-city"
 *   n   — name (string)
 *   c   — city (string)
 *   s   — state code (string)    e.g. "CA"
 *   a   — address (string)
 *   p   — phone (string)
 *   w   — website URL (string | null)
 *   r   — rating (number 0-5)
 *   v   — review count (number)
 *   pr  — price range "$"|"$$"|"$$$"
 *   ins — insuranceDirect (boolean)
 *   mob — mobileService (boolean)
 *   svc — serviceTypes (string[])
 *
 *   Enriched content (extracted from Outscraper extended columns when present):
 *   img   — main photo URL string (from Outscraper "main_photo" or "photo" column)
 *   hours — business hours object (from Outscraper "working_hours" column, JSON-parsed)
 *           e.g. { Monday: "8:00 AM – 5:00 PM", Tuesday: "8:00 AM – 5:00 PM", ... }
 *   reviews — NOT populated by this script; requires a separate Outscraper reviews export.
 *             Use the Outscraper "Reviews" product with the place_id/name as input,
 *             then merge results by shop id using ingest-reviews.js (to be built).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── CLI ────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function argValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const flags = {
  input: argValue('--input'),
  dryRun: args.includes('--dry-run'),
  shopsPath: argValue('--shops') ||
    path.resolve(__dirname, 'src/data/shops.js'),
};

if (!flags.input) {
  console.error('Usage: node ingest-shops.js --input <file.csv>[,<file2.csv>] [--dry-run]');
  process.exit(1);
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

// ── Normalize helpers ─────────────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeShopId(name, city) {
  return 'sf-' + toSlug(name).slice(0, 30) + '-' + toSlug(city).slice(0, 20);
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1 ${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 ${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone;
}

function phoneDigits(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function dedupKey(name, city, state) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const c = city.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s = state.toUpperCase();
  return `${n}|${c}|${s}`;
}

function priceTier(name) {
  const nl = name.toLowerCase();
  if (/safelite|national glass/.test(nl)) return '$$';
  if (/discount|budget|cheap|bargain/.test(nl)) return '$';
  if (/premium|luxury/.test(nl)) return '$$$';
  return '$$';
}

// ── ShieldFinder-specific field inference ─────────────────────────────────────
function inferMobileService(row) {
  const combined = [
    row.subtypes || '', row.category || '', row.about || '',
    row.name || '', row.description || '',
  ].join(' ').toLowerCase();
  return /mobile|on.?site|come to you|doorstep|at.?your|travel/.test(combined);
}

function inferInsuranceDirect(row) {
  const combined = [
    row.about || '', row.description || '', row.subtypes || '',
  ].join(' ').toLowerCase();
  return /insurance|progressive|allstate|geico|state farm|farmers|nationwide/.test(combined);
}

function inferServiceTypes(row) {
  const combined = [
    row.name || '', row.subtypes || '', row.category || '',
    row.about || '', row.description || '',
  ].join(' ').toLowerCase();
  const svc = [];
  if (/windshield|auto glass|wind shield/.test(combined)) svc.push('windshield_replacement');
  if (/chip|crack|repair/.test(combined)) svc.push('chip_repair');
  if (/side window|door glass/.test(combined)) svc.push('side_window');
  if (/rear window|back glass|back window/.test(combined)) svc.push('rear_window');
  if (/adas|calibrat|camera|sensor/.test(combined)) svc.push('adas_recalibration');
  if (svc.length === 0) svc.push('windshield_replacement', 'chip_repair');
  return svc;
}

// ── Enriched content extractors ───────────────────────────────────────────────

/**
 * Extract the main photo URL from an Outscraper row.
 * Outscraper exports the primary photo in "main_photo" or "photo" columns.
 * Returns null if no valid URL is found.
 */
function extractPhoto(row) {
  const url = (row.main_photo || row.photo || '').trim();
  if (!url || !url.startsWith('http')) return null;
  return url;
}

/**
 * Extract business hours from an Outscraper row.
 * Outscraper exports hours as a JSON string in the "working_hours" column,
 * e.g. '{"Monday":"9:00 AM \u2013 5:00 PM","Tuesday":"9:00 AM \u2013 5:00 PM",...}'
 * Returns a plain object { Monday: "...", Tuesday: "...", ... } or null.
 */
function extractHours(row) {
  const raw = (row.working_hours || row.hours || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_) {
    // Some exports use semicolon-delimited "Day: Hours; Day: Hours" format
    const pairs = raw.split(';').map(p => p.trim()).filter(Boolean);
    if (pairs.length > 0) {
      const obj = {};
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;
        const day = pair.slice(0, colonIdx).trim();
        const time = pair.slice(colonIdx + 1).trim();
        if (day && time) obj[day] = time;
      }
      if (Object.keys(obj).length > 0) return obj;
    }
  }
  return null;
}

// ── Blocklist filter ──────────────────────────────────────────────────────────
const BLOCKLIST = [
  'safelite autogl', // already have most safelites, keep some
  'permanently closed',
];
const BAD_CATEGORIES = [
  'tire shop', 'auto body', 'car wash', 'oil change',
  'mechanic', 'auto repair shop', 'used car dealer',
  'car dealer', 'car rental', 'insurance agency',
  'real estate', 'restaurant', 'hotel', 'grocery',
];

function isAutoGlassShop(row) {
  const name = (row.name || '').toLowerCase();
  const subtypes = (row.subtypes || '').toLowerCase();
  const category = (row.category || '').toLowerCase();
  const combined = name + ' ' + subtypes + ' ' + category;

  // Must have glass/windshield signal
  const hasGlassSignal = /glass|windshield|window|auto glass/.test(combined);
  if (!hasGlassSignal) return false;

  // Check bad categories
  for (const bad of BAD_CATEGORIES) {
    if (category === bad && !combined.includes('glass')) return false;
  }

  return true;
}

// ── Parse existing shops.js ───────────────────────────────────────────────────
function parseShopsJs(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn('shops.js not found at', filePath);
    return { shops: [], tail: '' };
  }
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract the array section
  const arrayStartIdx = content.indexOf('export const shops = [');
  if (arrayStartIdx === -1) throw new Error('Could not find shops array in ' + filePath);
  const arrayStart = content.indexOf('[', arrayStartIdx);
  const arrayEnd = content.lastIndexOf('];') + 1;
  const arrayContent = content.slice(arrayStart + 1, arrayEnd - 1);

  // Split into individual shop blocks by splitting on "},\n  {" boundaries
  // Use a regex that matches each { ... } block (potentially multi-line)
  const shops = [];
  const blockPattern = /\{([\s\S]*?)\},?\s*(?=\{|$)/g;
  let m;
  while ((m = blockPattern.exec(arrayContent)) !== null) {
    const block = m[1];
    if (!block.trim()) continue;
    const shop = {};

    // Parse double-quoted string fields: key: "value"
    const kvStrDq = /(\w+):\s*"((?:[^"\\]|\\.)*)"/g;
    let kv;
    while ((kv = kvStrDq.exec(block)) !== null) {
      shop[kv[1]] = kv[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    // Parse numeric fields: key: 4.9
    const kvNum = /(\w+):\s*([\d.]+)(?=[,\s}])/g;
    while ((kv = kvNum.exec(block)) !== null) {
      if (shop[kv[1]] === undefined) {
        shop[kv[1]] = kv[2].includes('.') ? parseFloat(kv[2]) : parseInt(kv[2], 10);
      }
    }

    // Parse boolean fields: key: true/false
    const kvBool = /(\w+):\s*(true|false)/g;
    while ((kv = kvBool.exec(block)) !== null) {
      if (shop[kv[1]] === undefined) shop[kv[1]] = kv[2] === 'true';
    }

    // Parse svc array: svc: ["a","b"]
    const svcMatch = block.match(/svc:\s*\[([\s\S]*?)\]/);
    if (svcMatch) {
      shop.svc = (svcMatch[1].match(/"([^"]+)"/g) || []).map(s => s.replace(/"/g, ''));
    }

    if (shop.i && shop.n) shops.push(shop);
  }

  // Tail = everything after the ]; that closes the shops array
  const closingIdx = content.indexOf('];\n', arrayStartIdx);
  const tail = closingIdx !== -1 ? content.slice(closingIdx + 3) : '';
  return { shops, tail };
}

// ── Serialize shop ────────────────────────────────────────────────────────────
function escapeJs(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function serializeShop(s) {
  const svcStr = (s.svc || []).map(t => `"${t}"`).join(',');
  let out = `  {` +
    ` i: "${s.i}", n: "${escapeJs(s.n)}", c: "${escapeJs(s.c)}", s: "${s.s}",` +
    `\n    a: "${escapeJs(s.a)}", p: "${escapeJs(s.p || '')}", w: "${escapeJs(s.w || '')}",` +
    ` r: ${Number(s.r || 0).toFixed(1)}, v: ${s.v || 0}, pr: "${s.pr || '$$'}",` +
    `\n    ins: ${!!s.ins}, mob: ${!!s.mob},` +
    `\n    svc: [${svcStr}],`;
  if (s.img) {
    out += `\n    img: "${escapeJs(s.img)}",`;
  }
  if (s.hours && typeof s.hours === 'object') {
    out += `\n    hours: ${JSON.stringify(s.hours)},`;
  }
  // reviews are not written by this script (requires separate Outscraper job)
  out += `\n  }`;
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('=== ShieldFinder Shop Ingestion ===\n');

  // Load all input CSVs
  const csvPaths = flags.input.split(',').map(p => p.trim());
  let rawRows = [];
  for (const csvPath of csvPaths) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCsv(content);
    console.log(`  ${path.basename(csvPath)}: ${rows.length} rows`);
    rawRows.push(...rows);
  }
  console.log(`Total raw rows: ${rawRows.length}\n`);

  // Load existing shops
  console.log(`Loading existing shops: ${flags.shopsPath}`);
  const { shops: existing, tail } = parseShopsJs(flags.shopsPath);
  console.log(`  Existing shops: ${existing.length}`);

  const existingIds = new Set(existing.map(s => s.i));
  const existingKeys = new Set(existing.map(s => dedupKey(s.n, s.c, s.s)));
  const existingPhones = new Set(
    existing.map(s => phoneDigits(s.p || '')).filter(d => d.length >= 10)
  );

  const prevStates = new Set(existing.map(s => s.s));
  console.log(`  Existing states: ${[...prevStates].sort().join(', ')}\n`);

  // Process incoming rows
  const rejected = {};
  function reject(reason, label) {
    if (!rejected[reason]) rejected[reason] = 0;
    rejected[reason]++;
  }

  const accepted = [];
  const newKeys = new Set();
  const newPhones = new Set();
  const newIds = new Set();

  for (const row of rawRows) {
    const name = (row.name || '').trim();
    const city = (row.city || '').trim();
    const state = (row.state_code || '').toUpperCase().trim();
    const address = (row.full_address || row.address || '').trim();
    const phone = (row.phone || '').trim();
    const website = (row.website || row.site || '').trim();
    const ratingStr = (row.rating || '').trim();
    const reviewStr = (row.reviews || '').trim();
    const businessStatus = (row.business_status || '').trim();

    if (!name) { reject('no_name', name); continue; }
    if (!state || !US_STATES.has(state)) { reject('invalid_state', name); continue; }
    if (businessStatus === 'CLOSED_PERMANENTLY') { reject('closed', name); continue; }

    const reviews = parseInt(reviewStr) || 0;
    if (reviews < 1) { reject('no_reviews', name); continue; }

    const rating = parseFloat(ratingStr) || 0;

    if (!isAutoGlassShop(row)) { reject('not_auto_glass', name); continue; }

    const key = dedupKey(name, city, state);
    if (existingKeys.has(key) || newKeys.has(key)) { reject('duplicate', name); continue; }

    const ph = phoneDigits(phone);
    if (ph.length >= 10 && (existingPhones.has(ph) || newPhones.has(ph))) {
      reject('duplicate_phone', name); continue;
    }

    // Generate unique id
    let baseId = makeShopId(name, city);
    let shopId = baseId;
    let suffix = 2;
    while (existingIds.has(shopId) || newIds.has(shopId)) {
      shopId = baseId + '-' + suffix++;
    }

    newKeys.add(key);
    if (ph.length >= 10) newPhones.add(ph);
    newIds.add(shopId);

    accepted.push({
      i: shopId,
      n: name,
      c: city,
      s: state,
      a: address,
      p: normalizePhone(phone),
      w: website || null,
      r: Math.round(rating * 10) / 10,
      v: reviews,
      pr: priceTier(name),
      ins: inferInsuranceDirect(row),
      mob: inferMobileService(row),
      svc: inferServiceTypes(row),
      img: extractPhoto(row),
      hours: extractHours(row),
    });
  }

  // Report
  console.log('=== Rejection Report ===');
  let totalRejected = 0;
  for (const [reason, count] of Object.entries(rejected)) {
    console.log(`  ${reason}: ${count}`);
    totalRejected += count;
  }
  console.log(`  Total rejected: ${totalRejected}`);
  console.log(`  Total accepted: ${accepted.length}\n`);

  if (accepted.length === 0) {
    console.log('No new shops to add. Done.');
    return;
  }

  // Merge and sort
  const validExisting = existing.filter(s => s.n && (s.v || 0) > 0);
  const merged = [...validExisting, ...accepted];
  merged.sort((a, b) => (b.v || 0) - (a.v || 0));

  const allStates = new Set(merged.map(s => s.s));
  const newStates = [...allStates].filter(s => !prevStates.has(s));

  console.log('=== Merge ===');
  console.log(`  ${validExisting.length} existing + ${accepted.length} new = ${merged.length} total`);
  console.log(`  States: ${allStates.size}${newStates.length ? ' (NEW: ' + newStates.join(', ') + ')' : ''}`);

  // State breakdown
  const byState = {};
  for (const s of merged) byState[s.s] = (byState[s.s] || 0) + 1;
  console.log('\n  State breakdown:');
  for (const [st, count] of Object.entries(byState).sort((a,b) => b[1]-a[1])) {
    const isNew = newStates.includes(st) ? ' [NEW]' : '';
    console.log(`    ${st}: ${count}${isNew}`);
  }

  if (flags.dryRun) {
    console.log('\n[dry-run] No changes written.');
    console.log('Would add:');
    accepted.slice(0, 20).forEach(s => console.log(`  + ${s.n} — ${s.c}, ${s.s} (${s.v} reviews)`));
    return;
  }

  // Write shops.js
  const fileContent = fs.readFileSync(flags.shopsPath, 'utf-8');
  const arrayStartIdx = fileContent.indexOf('export const shops = [');
  const headerUpToArray = fileContent.slice(0, arrayStartIdx);

  const lines = [
    headerUpToArray,
    'export const shops = [\n',
  ];
  for (const s of merged) lines.push(serializeShop(s) + ',\n');
  lines.push('];\n');
  if (tail) lines.push(tail);

  fs.writeFileSync(flags.shopsPath, lines.join(''), 'utf-8');
  console.log(`\nWrote ${merged.length} shops → ${flags.shopsPath}`);

  console.log('\n=== New Shops Added ===');
  const newByState = {};
  for (const s of accepted) newByState[s.s] = (newByState[s.s] || 0) + 1;
  for (const [st, count] of Object.entries(newByState).sort()) {
    const isNew = newStates.includes(st) ? ' [NEW STATE]' : '';
    console.log(`  ${st}: +${count}${isNew}`);
  }
}

main();
