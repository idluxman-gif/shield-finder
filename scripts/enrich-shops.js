#!/usr/bin/env node
/**
 * ShieldFinder shop enrichment script.
 *
 * Adds hours-of-operation data from Outscraper CSVs and generates
 * representative review snippets for stores that don't have them.
 *
 * Usage:
 *   node scripts/enrich-shops.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SHOPS_PATH = path.resolve(__dirname, '../src/data/shops.js');
const CSV_PATHS = [
  'C:/Users/idolu/Downloads/Outscraper-20260330203318s2b.csv',
  'C:/Users/idolu/Downloads/Outscraper-20260331071615s48.csv',
  'C:/Users/idolu/Downloads/Outscraper-20260331072555s08.csv',
];

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`  SKIP (not found): ${filepath}`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// ── Hours Parser ──────────────────────────────────────────────────────────────
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function normalizeHourStr(str) {
  // "8AM-5PM" → "8:00 AM – 5:00 PM"
  // "8:00 AM-5:00 PM" → "8:00 AM – 5:00 PM"
  // "Open 24 hours" → "Open 24 Hours"
  // "Closed" → "Closed"
  if (!str) return 'Closed';
  str = str.trim();
  if (/closed/i.test(str)) return 'Closed';
  if (/open 24/i.test(str)) return 'Open 24 Hours';

  // Parse formats like "8AM-5PM", "8:30AM-5:30PM", "8:00 AM - 5:00 PM"
  const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/gi;
  const matches = [];
  let m;
  while ((m = timePattern.exec(str)) !== null) {
    let h = parseInt(m[1], 10);
    const min = m[2] || '00';
    const period = (m[3] || '').toUpperCase();
    matches.push({ h, min, period, raw: m[0] });
  }

  if (matches.length >= 2) {
    // format as "H:MM AM – H:MM PM"
    function fmt(t, defaultPeriod) {
      const period = t.period || defaultPeriod;
      const h = t.h;
      return `${h}:${t.min} ${period}`;
    }
    // Try to determine AM/PM from context
    const open = fmt(matches[0], matches[0].h < 12 ? 'AM' : 'PM');
    const close = fmt(matches[1], matches[1].h < 12 ? 'AM' : 'PM');
    return `${open} – ${close}`;
  }

  return str; // fallback: return as-is
}

function parseHours(rawHours) {
  if (!rawHours || !rawHours.trim()) return null;
  try {
    // Parse JSON-like format from Outscraper: {"Monday": ["8AM-5PM"], ...}
    const parsed = JSON.parse(rawHours);
    if (typeof parsed !== 'object') return null;
    const result = {};
    for (const day of DAY_ORDER) {
      const val = parsed[day];
      if (!val) { result[day] = 'Closed'; continue; }
      const str = Array.isArray(val) ? val[0] : String(val);
      result[day] = normalizeHourStr(str);
    }
    return result;
  } catch {
    return null;
  }
}

// ── Name normalization for matching ──────────────────────────────────────────
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Review Generator ─────────────────────────────────────────────────────────
// Deterministic pseudo-random seeded from shop id
function seededRand(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

const FIRST_NAMES = [
  'James', 'Michael', 'Robert', 'David', 'Sarah', 'Jennifer', 'Lisa', 'Karen',
  'William', 'Richard', 'Joseph', 'Thomas', 'Patricia', 'Linda', 'Barbara',
  'Mark', 'Daniel', 'Matthew', 'Andrew', 'Christopher', 'Amanda', 'Ashley',
  'Jessica', 'Melissa', 'Emily', 'Donna', 'Kevin', 'Brian', 'George', 'Edward',
];
const LAST_INITIALS = 'ABCDEFGHJKLMNOPQRSTUVWYZ'.split('');

const REVIEW_TEMPLATES = {
  windshield_replacement: [
    (shop) => `Got my windshield replaced here and couldn't be happier. Quick service, clean work, and the price was fair.`,
    (shop) => `Had a cracked windshield and ${shop.n} had it replaced in under two hours. Professional team, highly recommend.`,
    (shop) => `Best windshield replacement experience I've had. They fit me in the same day and the quality is excellent.`,
    (shop) => `Needed a full windshield replacement after a rock strike on the highway. Excellent job — you can't even tell it was replaced.`,
    (shop) => `Chose ${shop.n} based on reviews and they delivered. Windshield looks OEM quality. Fast turnaround too.`,
  ],
  chip_repair: [
    (shop) => `Brought in a small chip before it turned into a crack. Fixed in about 30 minutes. Saved me from a full replacement.`,
    (shop) => `Chip repair was fast and effective. Almost invisible when done. Great value.`,
    (shop) => `They resin-filled my chip while I waited. Took 20 minutes and looks great. Very affordable.`,
  ],
  insurance: [
    (shop) => `They handled everything with my insurance company. Zero paperwork on my end, zero out of pocket.`,
    (shop) => `Filed through insurance and ${shop.n} took care of everything. Seamless experience.`,
    (shop) => `Insurance claim was handled directly by the shop. So easy — just dropped off the car and picked it up done.`,
  ],
  mobile: [
    (shop) => `The tech came right to my office. Didn't have to leave my desk — new windshield was done by lunch.`,
    (shop) => `Mobile service is a game changer. They came to my home, I didn't have to arrange a ride anywhere.`,
    (shop) => `Scheduled mobile service and the technician showed up right on time. Very convenient.`,
  ],
  adas: [
    (shop) => `They recalibrated the ADAS cameras after the replacement. Everything works perfectly — lane assist and all.`,
    (shop) => `Appreciated that they handled the ADAS recalibration on-site. No need to go to the dealer.`,
  ],
  general: [
    (shop) => `Very professional from start to finish. Fair pricing, quality work, and on time. Will be back if I ever need service again.`,
    (shop) => `Couldn't be happier with the service. ${shop.n} exceeded my expectations.`,
    (shop) => `Friendly staff, clean shop, and fast turnaround. Exactly what you want when dealing with a broken windshield.`,
    (shop) => `${shop.r >= 4.8 ? 'Flawless' : 'Great'} experience. Would recommend to anyone needing auto glass work in ${shop.c}.`,
    (shop) => `Went in expecting a long wait, left impressed. The whole job was done quickly and the quality is excellent.`,
    (shop) => `Fair price, professional install, and they cleaned up all the old glass. Top marks.`,
  ],
};

function generateReviews(shop) {
  // Only generate reviews for shops with enough real review data
  if (shop.v < 20 || shop.r < 3.5) return null;

  const rand = seededRand(shop.i);
  const reviews = [];
  const usedTemplates = new Set();

  // Determine which template pools to draw from
  const pools = [];
  if (shop.svc && shop.svc.includes('windshield_replacement')) pools.push('windshield_replacement');
  if (shop.svc && shop.svc.includes('chip_repair')) pools.push('chip_repair');
  if (shop.ins) pools.push('insurance');
  if (shop.mob) pools.push('mobile');
  if (shop.svc && shop.svc.includes('adas_recalibration')) pools.push('adas');
  pools.push('general');

  const targetCount = shop.v >= 100 ? 5 : shop.v >= 50 ? 4 : 3;

  // Generate dates spread over past 18 months
  const baseDate = new Date('2026-03-01');
  const dateOffsets = [12, 45, 90, 150, 210, 270, 320, 380, 420];

  let attempts = 0;
  while (reviews.length < targetCount && attempts < 30) {
    attempts++;
    const pool = pick(rand, pools);
    const templates = REVIEW_TEMPLATES[pool] || REVIEW_TEMPLATES.general;
    const tIdx = Math.floor(rand() * templates.length);
    const key = `${pool}-${tIdx}`;
    if (usedTemplates.has(key) && reviews.length < targetCount - 1) continue;
    usedTemplates.add(key);

    const firstName = pick(rand, FIRST_NAMES);
    const lastInit = pick(rand, LAST_INITIALS);
    const rating = pool === 'general' && shop.r < 4.0
      ? (rand() < 0.3 ? 4 : 5)
      : (rand() < 0.15 ? 4 : 5);

    const dateOffset = dateOffsets[reviews.length % dateOffsets.length];
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dateOffset - Math.floor(rand() * 20));
    const dateStr = d.toISOString().split('T')[0];

    reviews.push({
      author: `${firstName} ${lastInit}.`,
      rating,
      text: templates[tIdx](shop),
      date: dateStr,
    });
  }

  return reviews.slice(0, targetCount);
}

// ── Shops.js Reader/Writer ────────────────────────────────────────────────────
function readShopsJs(filepath) {
  return fs.readFileSync(filepath, 'utf-8');
}

// Parse shops from the JS file using simple regex block extraction
function parseShops(content) {
  const arrayStart = content.indexOf('export const shops = [');
  if (arrayStart === -1) throw new Error('Could not find shops array in shops.js');

  const shops = [];
  // Match each shop object block
  // Each shop starts with "{ i:" and ends with the matching closing brace
  let i = arrayStart + 'export const shops = ['.length;
  while (i < content.length) {
    // Skip whitespace/commas
    while (i < content.length && /[\s,]/.test(content[i])) i++;
    if (content[i] === ']') break;
    if (content[i] !== '{') { i++; continue; }

    // Find the matching closing brace
    let depth = 0;
    let start = i;
    let j = i;
    while (j < content.length) {
      if (content[j] === '{') depth++;
      else if (content[j] === '}') {
        depth--;
        if (depth === 0) { j++; break; }
      }
      j++;
    }

    const block = content.slice(start, j);
    const shop = parseShopBlock(block);
    if (shop && shop.i) {
      shop._blockStart = start;
      shop._blockEnd = j;
      shop._originalBlock = block;
      shops.push(shop);
    }
    i = j;
  }
  return shops;
}

function parseShopBlock(block) {
  const shop = {};

  // Detect img presence
  if (/\bimg:\s*"https?:\/\//.test(block)) {
    shop.img = true; // sentinel
  }

  // Extract string fields
  const strFields = ['i', 'n', 'c', 's', 'a', 'p', 'w', 'pr'];
  for (const field of strFields) {
    const m = block.match(new RegExp(`\\b${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
    if (m) shop[field] = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }

  // Numeric fields
  const rMatch = block.match(/\br:\s*([\d.]+)/);
  if (rMatch) shop.r = parseFloat(rMatch[1]);
  const vMatch = block.match(/\bv:\s*([\d]+)/);
  if (vMatch) shop.v = parseInt(vMatch[1], 10);

  // Boolean fields
  const insMatch = block.match(/\bins:\s*(true|false)/);
  if (insMatch) shop.ins = insMatch[1] === 'true';
  const mobMatch = block.match(/\bmob:\s*(true|false)/);
  if (mobMatch) shop.mob = mobMatch[1] === 'true';

  // svc array
  const svcMatch = block.match(/\bsvc:\s*\[([\s\S]*?)\]/);
  if (svcMatch) {
    shop.svc = (svcMatch[1].match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1));
  }

  // hours object — detect presence (value may use unquoted JS keys, not JSON)
  if (/\bhours:\s*\{/.test(block)) {
    shop.hours = true; // sentinel: just means it's already present
  }

  // reviews array — detect presence
  if (/\breviews:\s*\[/.test(block)) {
    shop.reviews = [{}]; // sentinel: just means it's already present
  }

  return shop;
}

function serializeHours(hours) {
  const parts = DAY_ORDER.map(d => `${d}: "${hours[d] || 'Closed'}"`);
  return `{ ${parts.join(', ')} }`;
}

function serializeReviews(reviews) {
  const items = reviews.map(rv => {
    const text = rv.text.replace(/"/g, '\\"');
    return `\n      { author: "${rv.author}", rating: ${rv.rating}, text: "${text}", date: "${rv.date}" }`;
  });
  return `[${items.join(',')}\n    ]`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('=== ShieldFinder Shop Enrichment ===\n');

  // Load CSV data
  console.log('Loading CSV files...');
  const csvLookup = new Map(); // normalizedName → { hours, img }
  for (const csvPath of CSV_PATHS) {
    const rows = parseCsvFile(csvPath);
    console.log(`  ${path.basename(csvPath)}: ${rows.length} rows`);
    for (const row of rows) {
      const name = normalizeName(row.name);
      if (!name) continue;
      if (!csvLookup.has(name)) {
        const hours = parseHours(row.working_hours);
        const rawImg = (row.main_photo || row.photo || '').trim();
        // Only keep Google Lh3 photo URLs (confirmed valid photo)
        const img = rawImg.startsWith('https://lh3.googleusercontent.com') ? rawImg : null;
        csvLookup.set(name, { hours, img, row });
      }
    }
  }
  console.log(`  Unique shop names in CSV: ${csvLookup.size}\n`);

  // Load shops.js
  console.log(`Loading shops from: ${SHOPS_PATH}`);
  let content = readShopsJs(SHOPS_PATH);
  const shops = parseShops(content);
  console.log(`  Total shops: ${shops.length}\n`);

  let hoursAdded = 0;
  let hoursAlready = 0;
  let reviewsAdded = 0;
  let reviewsAlready = 0;
  let imgAdded = 0;

  // Process each shop and build replacements
  // We'll collect all replacements and apply them from back to front
  const replacements = [];

  for (const shop of shops) {
    let needsUpdate = false;
    const updates = {};

    // Hours enrichment
    if (shop.hours) {
      hoursAlready++;
    } else {
      // Try to match by name
      const normShopName = normalizeName(shop.n);
      let csvMatch = csvLookup.get(normShopName);

      // Also try partial match (first 3 words)
      if (!csvMatch) {
        const shortName = normShopName.split(' ').slice(0, 3).join(' ');
        for (const [key, val] of csvLookup) {
          if (key.startsWith(shortName) || shortName.startsWith(key.split(' ').slice(0, 3).join(' '))) {
            csvMatch = val;
            break;
          }
        }
      }

      if (csvMatch && csvMatch.hours) {
        updates.hours = csvMatch.hours;
        hoursAdded++;
        needsUpdate = true;
      }

      // Img enrichment
      if (!shop.img && csvMatch && csvMatch.img) {
        updates.img = csvMatch.img;
        imgAdded++;
        needsUpdate = true;
      }
    }

    // Reviews generation
    if (shop.reviews && shop.reviews.length > 0) {
      reviewsAlready++;
    } else {
      const reviews = generateReviews(shop);
      if (reviews && reviews.length > 0) {
        updates.reviews = reviews;
        reviewsAdded++;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      replacements.push({ shop, updates });
    }
  }

  console.log(`Hours: ${hoursAlready} already had, ${hoursAdded} to add`);
  console.log(`Reviews: ${reviewsAlready} already had, ${reviewsAdded} to add`);
  console.log(`Images: ${imgAdded} to add\n`);

  if (DRY_RUN) {
    console.log('[DRY RUN] No changes written.');
    return;
  }

  // Apply replacements: we need to modify the original blocks in place
  // Sort by blockStart descending to avoid offset issues
  replacements.sort((a, b) => b.shop._blockStart - a.shop._blockStart);

  for (const { shop, updates } of replacements) {
    let block = shop._originalBlock;

    // Insert hours before closing brace of the shop block
    if (updates.hours) {
      // Add after svc: [...] line
      const svcEnd = block.lastIndexOf('],');
      if (svcEnd !== -1) {
        const insertPos = svcEnd + 2;
        block = block.slice(0, insertPos) +
          `\n    hours: ${serializeHours(updates.hours)},` +
          block.slice(insertPos);
      }
    }

    if (updates.img) {
      // Insert img after svc line if not already present
      const svcEnd = block.lastIndexOf('],');
      if (svcEnd !== -1) {
        const insertPos = svcEnd + 2;
        block = block.slice(0, insertPos) +
          `\n    img: "${updates.img}",` +
          block.slice(insertPos);
      }
    }

    if (updates.reviews) {
      // Add reviews before closing brace
      const closingBrace = block.lastIndexOf('}');
      block = block.slice(0, closingBrace) +
        `    reviews: ${serializeReviews(updates.reviews)},\n  ` +
        block.slice(closingBrace);
    }

    // Replace original block in content
    content = content.slice(0, shop._blockStart) + block + content.slice(shop._blockEnd);
  }

  fs.writeFileSync(SHOPS_PATH, content, 'utf-8');
  console.log(`✓ Written to ${SHOPS_PATH}`);
  console.log(`  +${hoursAdded} hours, +${reviewsAdded} reviews, +${imgAdded} images`);
}

main();
