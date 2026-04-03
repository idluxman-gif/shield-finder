#!/usr/bin/env node
/**
 * Second-pass scrape: queries with limit=50 across all 50 states
 * plus supplemental city-level queries for large states.
 * Dedup prevents duplicates.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.OUTSCRAPER_API_KEY;
if (!API_KEY) { console.error('ERROR: OUTSCRAPER_API_KEY not set'); process.exit(1); }

const SHOPS_PATH = path.resolve(__dirname, '../src/data/shops.js');

// All 50 states + supplemental city queries for large states
const QUERIES = [
  // State-level queries for all 50 states
  { state: 'AL', q: 'auto glass repair Alabama, US' },
  { state: 'AK', q: 'auto glass repair Alaska, US' },
  { state: 'AZ', q: 'auto glass repair Phoenix AZ' },
  { state: 'AR', q: 'auto glass repair Arkansas, US' },
  { state: 'CA', q: 'auto glass repair Los Angeles CA' },
  { state: 'CA', q: 'auto glass repair San Diego CA' },
  { state: 'CA', q: 'auto glass repair San Jose CA' },
  { state: 'CA', q: 'auto glass repair Sacramento CA' },
  { state: 'CO', q: 'auto glass repair Denver CO' },
  { state: 'CT', q: 'windshield repair Connecticut, US' },
  { state: 'DE', q: 'auto glass repair Delaware, US' },
  { state: 'FL', q: 'auto glass repair Miami FL' },
  { state: 'FL', q: 'auto glass repair Orlando FL' },
  { state: 'FL', q: 'auto glass repair Jacksonville FL' },
  { state: 'GA', q: 'auto glass repair Georgia, US' },
  { state: 'HI', q: 'auto glass repair Hawaii, US' },
  { state: 'ID', q: 'auto glass repair Idaho, US' },
  { state: 'IL', q: 'auto glass repair Chicago IL' },
  { state: 'IL', q: 'auto glass repair Springfield IL' },
  { state: 'IN', q: 'auto glass repair Indianapolis IN' },
  { state: 'IA', q: 'auto glass repair Iowa, US' },
  { state: 'KS', q: 'auto glass repair Kansas, US' },
  { state: 'KY', q: 'auto glass repair Kentucky, US' },
  { state: 'LA', q: 'auto glass repair Louisiana, US' },
  { state: 'ME', q: 'windshield repair Maine, US' },
  { state: 'MD', q: 'auto glass repair Maryland, US' },
  { state: 'MA', q: 'auto glass repair Boston MA' },
  { state: 'MI', q: 'auto glass repair Michigan, US' },
  { state: 'MN', q: 'auto glass repair Minnesota, US' },
  { state: 'MS', q: 'auto glass repair Mississippi, US' },
  { state: 'MO', q: 'auto glass repair Missouri, US' },
  { state: 'MT', q: 'auto glass repair Montana, US' },
  { state: 'NE', q: 'auto glass repair Nebraska, US' },
  { state: 'NV', q: 'auto glass repair Las Vegas NV' },
  { state: 'NH', q: 'auto glass repair New Hampshire, US' },
  { state: 'NJ', q: 'windshield repair New Jersey, US' },
  { state: 'NM', q: 'auto glass repair New Mexico, US' },
  { state: 'NY', q: 'auto glass repair New York City NY' },
  { state: 'NY', q: 'auto glass repair Buffalo NY' },
  { state: 'NC', q: 'auto glass repair North Carolina, US' },
  { state: 'ND', q: 'auto glass repair North Dakota, US' },
  { state: 'OH', q: 'auto glass repair Columbus OH' },
  { state: 'OK', q: 'auto glass repair Oklahoma City OK' },
  { state: 'OR', q: 'auto glass repair Portland OR' },
  { state: 'PA', q: 'auto glass repair Pittsburgh PA' },
  { state: 'PA', q: 'auto glass repair Allentown PA' },
  { state: 'RI', q: 'auto glass repair Rhode Island, US' },
  { state: 'SC', q: 'auto glass repair South Carolina, US' },
  { state: 'SD', q: 'auto glass repair South Dakota, US' },
  { state: 'TN', q: 'auto glass repair Nashville TN' },
  { state: 'TX', q: 'auto glass repair Houston TX' },
  { state: 'TX', q: 'auto glass repair Dallas TX' },
  { state: 'TX', q: 'auto glass repair San Antonio TX' },
  { state: 'TX', q: 'auto glass repair Austin TX' },
  { state: 'UT', q: 'auto glass repair Salt Lake City UT' },
  { state: 'VT', q: 'auto glass repair Vermont, US' },
  { state: 'VA', q: 'auto glass repair Virginia, US' },
  { state: 'WA', q: 'auto glass repair Seattle WA' },
  { state: 'WA', q: 'auto glass repair Spokane WA' },
  { state: 'WV', q: 'auto glass repair West Virginia, US' },
  { state: 'WI', q: 'auto glass repair Wisconsin, US' },
  { state: 'WY', q: 'auto glass repair Wyoming, US' },
];

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

function toSlug(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function makeShopId(name, city) { return 'sf-' + toSlug(name).slice(0,30) + '-' + toSlug(city).slice(0,20); }
function normalizePhone(phone) {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+1 ${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0]==='1') return `+1 ${d.slice(1,4)}-${d.slice(4,7)}-${d.slice(7)}`;
  return phone;
}
function phoneDigits(phone) { return (phone||'').replace(/\D/g,''); }
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
  return /mobile|on.?site|come to you|doorstep/.test([r.subtypes||'',r.category||'',r.name||''].join(' ').toLowerCase());
}
function inferInsurance(r) {
  return /insurance|progressive|allstate|geico|state farm/.test([r.about||'',r.subtypes||''].join(' ').toLowerCase());
}
function inferSvc(r) {
  const c = [r.name||'',r.subtypes||'',r.category||''].join(' ').toLowerCase();
  const svc = [];
  if (/windshield|auto glass/.test(c)) svc.push('windshield_replacement');
  if (/chip|crack|repair/.test(c)) svc.push('chip_repair');
  if (/side window|door glass/.test(c)) svc.push('side_window');
  if (/rear window|back glass/.test(c)) svc.push('rear_window');
  if (/adas|calibrat/.test(c)) svc.push('adas_recalibration');
  if (svc.length===0) svc.push('windshield_replacement','chip_repair');
  return svc;
}
function isAutoGlass(r) {
  return /glass|windshield|window/.test([r.name||'',r.subtypes||'',r.category||''].join(' ').toLowerCase());
}
function extractHours(r) {
  if (!r.working_hours) return null;
  if (typeof r.working_hours==='object'&&!Array.isArray(r.working_hours)) {
    const out={};
    for (const [day,val] of Object.entries(r.working_hours)) out[day]=Array.isArray(val)?val.join(', '):val;
    return out;
  }
  return null;
}
function escapeJs(str) { return String(str||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }
function serializeShop(s) {
  const svcStr=(s.svc||[]).map(t=>`"${t}"`).join(',');
  let out=`  { i: "${s.i}", n: "${escapeJs(s.n)}", c: "${escapeJs(s.c)}", s: "${s.s}",`+
    `\n    a: "${escapeJs(s.a)}", p: "${escapeJs(s.p||'')}", w: "${escapeJs(s.w||'')}",`+
    ` r: ${Number(s.r||0).toFixed(1)}, v: ${s.v||0}, pr: "${s.pr||'$$'}",`+
    `\n    ins: ${!!s.ins}, mob: ${!!s.mob},`+
    `\n    svc: [${svcStr}],`;
  if (s.img) out+=`\n    img: "${escapeJs(s.img)}",`;
  if (s.hours&&typeof s.hours==='object') out+=`\n    hours: ${JSON.stringify(s.hours)},`;
  out+=`\n  }`;
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
      if (shop[kv[1]]===undefined) shop[kv[1]]=kv[2].includes('.')?parseFloat(kv[2]):parseInt(kv[2],10);
    }
    const kvBool = /(\w+):\s*(true|false)/g;
    while ((kv = kvBool.exec(block)) !== null) {
      if (shop[kv[1]]===undefined) shop[kv[1]]=kv[2]==='true';
    }
    const svcMatch = block.match(/svc:\s*\[([\s\S]*?)\]/);
    if (svcMatch) shop.svc=(svcMatch[1].match(/"([^"]+)"/g)||[]).map(s=>s.replace(/"/g,''));
    if (shop.i&&shop.n) shops.push(shop);
  }
  const closingIdx = content.indexOf('];\n', arrayStartIdx);
  const tail = closingIdx !== -1 ? content.slice(closingIdx + 3) : '';
  return { shops, tail, header: content.slice(0, arrayStartIdx) };
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON parse: ' + data.slice(0,200))); }
      });
    });
    req.on('error', reject);
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== ShieldFinder: Pass-2 Scrape ===\n');

  const { shops: existing, tail, header } = parseShopsJs(SHOPS_PATH);
  console.log(`Existing shops: ${existing.length}`);

  const existingIds = new Set(existing.map(s => s.i));
  const existingKeys = new Set(existing.map(s => dedupKey(s.n, s.c, s.s)));
  const existingPhones = new Set(existing.map(s => phoneDigits(s.p||'')).filter(d => d.length >= 10));

  const newIds = new Set();
  const newKeys = new Set();
  const newPhones = new Set();
  const allNew = [];

  for (const { state: stateCode, q: queryStr } of QUERIES) {
    process.stdout.write(`  [${stateCode}] "${queryStr}"... `);

    let rows;
    try {
      const url = `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(queryStr)}&limit=50&language=en&async=false`;
      const { status, body } = await fetchJson(url, { 'X-API-KEY': API_KEY });
      if (status !== 200) { console.log(`HTTP ${status}`); await sleep(2000); continue; }
      rows = (body.data || []).flat();
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      await sleep(2000);
      continue;
    }

    let accepted = 0;
    const rejected = {};
    const rej = r => { rejected[r]=(rejected[r]||0)+1; };

    for (const row of rows) {
      const name = (row.name||'').trim();
      const city = (row.city||'').trim();
      const sc = (row.state_code||'').toUpperCase().trim();
      const address = (row.address||row.full_address||'').trim();
      const phone = (row.phone||'').trim();
      const website = (row.website||row.site||'').trim();
      const reviews = parseInt(row.reviews||0)||0;
      const rating = parseFloat(row.rating||0)||0;

      if (!name) { rej('no_name'); continue; }
      if (!sc||!US_STATES.has(sc)) { rej('invalid_state'); continue; }
      if ((row.business_status||'')==='CLOSED_PERMANENTLY') { rej('closed'); continue; }
      if (reviews < 1) { rej('no_reviews'); continue; }
      if (!isAutoGlass(row)) { rej('not_auto_glass'); continue; }

      const key = dedupKey(name, city, sc);
      if (existingKeys.has(key)||newKeys.has(key)) { rej('dup'); continue; }

      const ph = phoneDigits(phone);
      if (ph.length>=10&&(existingPhones.has(ph)||newPhones.has(ph))) { rej('dup_phone'); continue; }

      let shopId = makeShopId(name, city);
      let suffix = 2;
      while (existingIds.has(shopId)||newIds.has(shopId)) shopId = makeShopId(name,city)+'-'+suffix++;

      newKeys.add(key);
      if (ph.length>=10) newPhones.add(ph);
      newIds.add(shopId);
      accepted++;

      allNew.push({
        i: shopId, n: name, c: city, s: sc, a: address,
        p: normalizePhone(phone), w: website||null,
        r: Math.round(rating*10)/10, v: reviews,
        pr: priceTier(name), ins: inferInsurance(row), mob: inferMobile(row),
        svc: inferSvc(row),
        img: (row.photo||row.main_photo||null),
        hours: extractHours(row),
      });
    }

    const rejStr = Object.entries(rejected).map(([k,v])=>`${k}:${v}`).join(' ');
    console.log(`${rows.length} raw → ${accepted} accepted${rejStr?' ['+rejStr+']':''}`);
    await sleep(300);
  }

  console.log(`\nNew shops accepted: ${allNew.length}`);
  if (allNew.length === 0) { console.log('No new shops.'); return; }

  const merged = [...existing, ...allNew];
  merged.sort((a, b) => (b.v||0) - (a.v||0));

  const byState = {};
  for (const s of merged) byState[s.s]=(byState[s.s]||0)+1;

  console.log(`\nMerged total: ${merged.length} shops across ${Object.keys(byState).length} states`);
  for (const [st, count] of Object.entries(byState).sort()) console.log(`  ${st}: ${count}`);

  const lines = [header, 'export const shops = [\n'];
  for (const s of merged) lines.push(serializeShop(s) + ',\n');
  lines.push('];\n');
  if (tail) lines.push(tail);
  fs.writeFileSync(SHOPS_PATH, lines.join(''), 'utf-8');
  console.log(`\nWrote ${merged.length} shops → ${SHOPS_PATH}`);
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total shops: ${merged.length}`);
  console.log(`States: ${Object.keys(byState).length}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
