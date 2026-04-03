#!/usr/bin/env node
/**
 * Scrape auto glass shops for all missing US states via Outscraper API
 * and ingest them directly into shops.js.
 *
 * Usage: node scripts/scrape-missing-states.js [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OUTSCRAPER_API_KEY;
if (!API_KEY) {
  console.error('ERROR: OUTSCRAPER_API_KEY not set');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const SHOPS_PATH = path.resolve(__dirname, '../src/data/shops.js');

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', DE: 'Delaware', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NM: 'New Mexico', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

// ── Helpers (from ingest-shops.js) ─────────────────────────────────────────

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
  return (phone || '').replace(/\D/g, '');
}
function dedupKey(name, city, state) {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g,'')}|${city.toLowerCase().replace(/[^a-z0-9]/g,'')}|${state.toUpperCase()}`;
}
function priceTier(name) {
  const nl = name.toLowerCase();
  if (/safelite|national glass/.test(nl)) return '$$';
  if (/discount|budget|cheap|bargain/.test(nl)) return '$';
  if (/premium|luxury/.test(nl)) return '$$$';
  return '$$';
}
function inferMobile(r) {
  const c = [r.subtypes||'', r.category||'', r.about||'', r.name||''].join(' ').toLowerCase();
  return /mobile|on.?site|come to you|doorstep|at.?your|travel/.test(c);
}
function inferInsurance(r) {
  const c = [r.about||'', r.subtypes||''].join(' ').toLowerCase();
  return /insurance|progressive|allstate|geico|state farm|farmers|nationwide/.test(c);
}
function inferSvc(r) {
  const c = [r.name||'', r.subtypes||'', r.category||''].join(' ').toLowerCase();
  const svc = [];
  if (/windshield|auto glass/.test(c)) svc.push('windshield_replacement');
  if (/chip|crack|repair/.test(c)) svc.push('chip_repair');
  if (/side window|door glass/.test(c)) svc.push('side_window');
  if (/rear window|back glass/.test(c)) svc.push('rear_window');
  if (/adas|calibrat/.test(c)) svc.push('adas_recalibration');
  if (svc.length === 0) svc.push('windshield_replacement', 'chip_repair');
  return svc;
}
function isAutoGlass(r) {
  const c = [(r.name||''), (r.subtypes||''), (r.category||'')].join(' ').toLowerCase();
  return /glass|windshield|window/.test(c);
}
function extractHours(r) {
  if (!r.working_hours) return null;
  if (typeof r.working_hours === 'object' && !Array.isArray(r.working_hours)) {
    // Convert array format like { Monday: ["8AM-5PM"] } → { Monday: "8AM-5PM" }
    const out = {};
    for (const [day, val] of Object.entries(r.working_hours)) {
      out[day] = Array.isArray(val) ? val.join(', ') : val;
    }
    return out;
  }
  return null;
}

// ── shops.js parser/writer ────────────────────────────────────────────────

function escapeJs(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function serializeShop(s) {
  const svcStr = (s.svc || []).map(t => `"${t}"`).join(',');
  let out = `  {` +
    ` i: "${s.i}", n: "${escapeJs(s.n)}", c: "${escapeJs(s.c)}", s: "${s.s}",` +
    `\n    a: "${escapeJs(s.a)}", p: "${escapeJs(s.p||'')}", w: "${escapeJs(s.w||'')}",` +
    ` r: ${Number(s.r||0).toFixed(1)}, v: ${s.v||0}, pr: "${s.pr||'$$'}",` +
    `\n    ins: ${!!s.ins}, mob: ${!!s.mob},` +
    `\n    svc: [${svcStr}],`;
  if (s.img) out += `\n    img: "${escapeJs(s.img)}",`;
  if (s.hours && typeof s.hours === 'object') out += `\n    hours: ${JSON.stringify(s.hours)},`;
  out += `\n  }`;
  return out;
}

function parseShopsJs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const arrayStartIdx = content.indexOf('export const shops = [');
  const arrayStart = content.indexOf('[', arrayStartIdx);
  const arrayEnd = content.lastIndexOf('];') + 1;
  const arrayContent = content.slice(arrayStart + 1, arrayEnd - 1);
  const shops = [];
  const blockPattern = /\{([\s\S]*?)\},?\s*(?=\{|$)/g;
  let m;
  while ((m = blockPattern.exec(arrayContent)) !== null) {
    const block = m[1];
    if (!block.trim()) continue;
    const shop = {};
    const kvStrDq = /(\w+):\s*"((?:[^"\\]|\\.)*)"/g;
    let kv;
    while ((kv = kvStrDq.exec(block)) !== null) shop[kv[1]] = kv[2];
    const kvNum = /(\w+):\s*([\d.]+)(?=[,\s}])/g;
    while ((kv = kvNum.exec(block)) !== null) {
      if (shop[kv[1]] === undefined) shop[kv[1]] = kv[2].includes('.') ? parseFloat(kv[2]) : parseInt(kv[2], 10);
    }
    const kvBool = /(\w+):\s*(true|false)/g;
    while ((kv = kvBool.exec(block)) !== null) {
      if (shop[kv[1]] === undefined) shop[kv[1]] = kv[2] === 'true';
    }
    const svcMatch = block.match(/svc:\s*\[([\s\S]*?)\]/);
    if (svcMatch) shop.svc = (svcMatch[1].match(/"([^"]+)"/g)||[]).map(s => s.replace(/"/g,''));
    if (shop.i && shop.n) shops.push(shop);
  }
  const closingIdx = content.indexOf('];\n', arrayStartIdx);
  const tail = closingIdx !== -1 ? content.slice(closingIdx + 3) : '';
  return { shops, tail, header: content.slice(0, arrayStartIdx) };
}

// ── Outscraper API ────────────────────────────────────────────────────────

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// For large/ambiguous states use city-focused queries
const STATE_CITY_OVERRIDES = {
  CA: 'Los Angeles CA',
  IL: 'Chicago IL',
  PA: 'Philadelphia PA',
  OH: 'Columbus OH',
  MI: 'Detroit MI',
  GA: 'Atlanta GA',
  NC: 'Charlotte NC',
  VA: 'Richmond VA',
  WA: 'Seattle WA',
  MA: 'Boston MA',
  CO: 'Denver CO',
  MN: 'Minneapolis MN',
  MO: 'Kansas City MO',
  MD: 'Baltimore MD',
  WI: 'Milwaukee WI',
  IN: 'Indianapolis IN',
};

async function scrapeState(stateCode, stateName, limit = 20) {
  const cityOverride = STATE_CITY_OVERRIDES[stateCode];
  const queryTerm = cityOverride
    ? `auto glass repair ${cityOverride}`
    : `auto glass repair ${stateName}, US`;
  const query = encodeURIComponent(queryTerm);
  const url = `https://api.app.outscraper.com/maps/search-v3?query=${query}&limit=${limit}&language=en&async=false`;

  const { status, body } = await fetchJson(url, { 'X-API-KEY': API_KEY });

  if (status !== 200) {
    console.error(`  ERROR ${status} for ${stateCode}:`, JSON.stringify(body).slice(0, 200));
    return [];
  }

  // data is array of arrays (one per query)
  const results = (body.data || []).flat();
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== ShieldFinder: Scrape Missing States ===\n');

  // Load existing shops
  const { shops: existing, tail, header } = parseShopsJs(SHOPS_PATH);
  console.log(`Existing shops: ${existing.length}`);
  const existingStates = new Set(existing.map(s => s.s));
  console.log(`Existing states (${existingStates.size}): ${[...existingStates].sort().join(', ')}\n`);

  // Determine missing states
  const missingStates = Object.keys(STATE_NAMES).filter(s => !existingStates.has(s));
  console.log(`Missing states (${missingStates.length}): ${missingStates.join(', ')}\n`);

  // Build dedup sets from existing
  const existingIds = new Set(existing.map(s => s.i));
  const existingKeys = new Set(existing.map(s => dedupKey(s.n, s.c, s.s)));
  const existingPhones = new Set(existing.map(s => phoneDigits(s.p||'')).filter(d => d.length >= 10));

  const newIds = new Set();
  const newKeys = new Set();
  const newPhones = new Set();
  const allNew = [];

  // Scrape each missing state
  for (const stateCode of missingStates) {
    const stateName = STATE_NAMES[stateCode];
    process.stdout.write(`  Scraping ${stateCode} (${stateName})... `);

    let rows;
    try {
      rows = await scrapeState(stateCode, stateName, 20);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      await sleep(2000);
      continue;
    }

    const accepted = [];
    const rejected = {};
    const rej = (r) => { rejected[r] = (rejected[r]||0)+1; };

    for (const row of rows) {
      const name = (row.name || '').trim();
      const city = (row.city || '').trim();
      const sc = (row.state_code || '').toUpperCase().trim();
      const address = (row.address || row.full_address || '').trim();
      const phone = (row.phone || '').trim();
      const website = (row.website || row.site || '').trim();
      const reviews = parseInt(row.reviews || 0) || 0;
      const rating = parseFloat(row.rating || 0) || 0;
      const businessStatus = (row.business_status || '').trim();

      if (!name) { rej('no_name'); continue; }
      if (!sc || !US_STATES.has(sc)) { rej('invalid_state'); continue; }
      if (businessStatus === 'CLOSED_PERMANENTLY') { rej('closed'); continue; }
      if (reviews < 1) { rej('no_reviews'); continue; }
      if (!isAutoGlass(row)) { rej('not_auto_glass'); continue; }

      const key = dedupKey(name, city, sc);
      if (existingKeys.has(key) || newKeys.has(key)) { rej('dup'); continue; }

      const ph = phoneDigits(phone);
      if (ph.length >= 10 && (existingPhones.has(ph) || newPhones.has(ph))) { rej('dup_phone'); continue; }

      let shopId = makeShopId(name, city);
      let suffix = 2;
      while (existingIds.has(shopId) || newIds.has(shopId)) shopId = makeShopId(name, city) + '-' + suffix++;

      newKeys.add(key);
      if (ph.length >= 10) newPhones.add(ph);
      newIds.add(shopId);

      accepted.push({
        i: shopId, n: name, c: city, s: sc, a: address,
        p: normalizePhone(phone),
        w: website || null,
        r: Math.round(rating * 10) / 10,
        v: reviews,
        pr: priceTier(name),
        ins: inferInsurance(row),
        mob: inferMobile(row),
        svc: inferSvc(row),
        img: (row.photo || row.main_photo || null),
        hours: extractHours(row),
      });
    }

    allNew.push(...accepted);
    const rejStr = Object.entries(rejected).map(([k,v]) => `${k}:${v}`).join(' ');
    console.log(`${rows.length} raw → ${accepted.length} accepted${rejStr ? ` [${rejStr}]` : ''}`);

    // Small delay to avoid rate limiting
    await sleep(500);
  }

  console.log(`\nTotal new shops accepted: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('No new shops. Done.');
    return;
  }

  // Merge, sort by reviews desc
  const merged = [...existing, ...allNew];
  merged.sort((a, b) => (b.v || 0) - (a.v || 0));

  const allStates = new Set(merged.map(s => s.s));
  const newStateSet = new Set(allNew.map(s => s.s));

  console.log(`\nMerged: ${existing.length} existing + ${allNew.length} new = ${merged.length} total`);
  console.log(`States covered: ${allStates.size}`);

  // State breakdown
  const byState = {};
  for (const s of merged) byState[s.s] = (byState[s.s]||0) + 1;
  const missing50 = Object.keys(STATE_NAMES).filter(s => !allStates.has(s));
  console.log('\nState breakdown:');
  for (const [st, count] of Object.entries(byState).sort()) {
    const isNew = newStateSet.has(st) ? ' [NEW]' : '';
    console.log(`  ${st}: ${count}${isNew}`);
  }
  if (missing50.length > 0) console.log(`\nStill missing: ${missing50.join(', ')}`);

  if (DRY_RUN) {
    console.log('\n[dry-run] Not writing. Would update shops.js with', merged.length, 'shops.');
    return;
  }

  // Write shops.js
  const lines = [header, 'export const shops = [\n'];
  for (const s of merged) lines.push(serializeShop(s) + ',\n');
  lines.push('];\n');
  if (tail) lines.push(tail);

  fs.writeFileSync(SHOPS_PATH, lines.join(''), 'utf-8');
  console.log(`\nWrote ${merged.length} shops → ${SHOPS_PATH}`);

  // Summary for Paperclip comment
  console.log('\n=== SUMMARY ===');
  console.log(`Total shops: ${merged.length}`);
  console.log(`Total states: ${allStates.size}`);
  console.log(`New shops added: ${allNew.length}`);
  console.log(`New states added: ${[...newStateSet].sort().join(', ')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
