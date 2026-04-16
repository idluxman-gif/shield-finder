#!/usr/bin/env node
/**
 * Premium Listing Outreach Send Script
 *
 * Sends personalized premium listing emails to auto glass shop owners.
 * Supports both ShieldFinder and ScratchAndDentGuide via --site flag.
 * Uses the HTML template at src/emails/premium-listing-outreach.html and
 * personalizes {{STORE_SLUG}} / {{UNSUBSCRIBE_URL}} for each recipient.
 *
 * Usage:
 *   node scripts/send-premium-outreach.js --site shieldfinder --input recipients.csv
 *   node scripts/send-premium-outreach.js --site sad --input recipients.csv
 *   node scripts/send-premium-outreach.js --site shieldfinder --input recipients.csv --dry-run
 *   node scripts/send-premium-outreach.js --site shieldfinder --input recipients.csv --limit 10
 *
 * CSV format (header row optional):
 *   shopName,email
 *   Clear View Auto Glass,owner@clearviewglass.com
 *   Quick Chip Repair,info@quickchiprepair.com
 *
 *   Optional third column for explicit slug override:
 *   shopName,email,slug
 *   Clear View Auto Glass,owner@clearviewglass.com,clear-view-auto-glass-phoenix
 *
 * Required environment variable:
 *   RESEND_API_KEY   Resend API key (not required for --dry-run)
 *
 * Optional environment variables:
 *   SITE_BASE_URL          Override base URL
 *   UNSUBSCRIBE_BASE_URL   Override unsubscribe URL base
 *   OUTREACH_FROM          Override sender address
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Site configs ───────────────────────────────────────────────────────────────

const SITE_CONFIGS = {
  shieldfinder: {
    baseUrl: 'https://www.shieldfinder.com',
    from: 'ShieldFinder <outreach@shieldfinder.com>',
    subject: "Your shop is already on our site — here's how to get customers calling",
    displayName: 'ShieldFinder.com',
  },
  sad: {
    baseUrl: 'https://www.scratchanddentguide.com',
    from: 'Scratch & Dent Guide <outreach@scratchanddentguide.com>',
    subject: "Your store is already on our site — here's how to get customers calling",
    displayName: 'ScratchAndDentGuide.com',
  },
};

// ── Config ─────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DELAY_MS = 1100; // ~54/min — well within Resend rate limits

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--input' && argv[i + 1]) args.input = argv[++i];
    else if (argv[i] === '--from' && argv[i + 1]) args.from = argv[++i];
    else if (argv[i] === '--limit' && argv[i + 1]) args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--site' && argv[i + 1]) args.site = argv[++i].toLowerCase();
  }
  return args;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  // Skip header row if detected
  const firstCell = lines[0]?.split(',')[0] || '';
  const start = /^(shopname|shop.?name|name|shop|store)/i.test(firstCell) ? 1 : 0;
  return lines.slice(start).map(line => {
    // Handle quoted fields (e.g. "Spencer's TV & Appliance")
    const parts = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    parts.push(current.trim());
    return {
      shopName: parts[0] || '',
      email: parts[1] || '',
      slugOverride: parts[2] || '',
    };
  }).filter(r => r.shopName && r.email && r.email.includes('@'));
}

async function sendViaResend(to, subject, html, from) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ from, to, subject, html });
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Resend HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (!args.input || !args.site) {
    console.error('Usage: node scripts/send-premium-outreach.js --site <shieldfinder|sad> --input recipients.csv [--dry-run] [--limit N]');
    console.error('');
    console.error('  --site shieldfinder  Send for ShieldFinder.com (default)');
    console.error('  --site sad           Send for ScratchAndDentGuide.com');
    console.error('');
    console.error('CSV columns: shopName,email[,slugOverride]');
    process.exit(1);
  }

  const siteConfig = SITE_CONFIGS[args.site];
  if (!siteConfig) {
    console.error(`Error: Unknown site "${args.site}". Valid options: shieldfinder, sad`);
    process.exit(1);
  }

  // Allow env var overrides
  const BASE_URL = process.env.SITE_BASE_URL || siteConfig.baseUrl;
  const UNSUBSCRIBE_BASE = process.env.UNSUBSCRIBE_BASE_URL || `${BASE_URL}/unsubscribe`;
  const DEFAULT_FROM = process.env.OUTREACH_FROM || siteConfig.from;
  const SUBJECT = siteConfig.subject;

  if (!args.dryRun && !RESEND_API_KEY) {
    console.error('Error: RESEND_API_KEY env var required for live send. Use --dry-run to preview.');
    process.exit(1);
  }

  // Load template
  const templatePath = path.join(__dirname, '..', 'src', 'emails', 'premium-listing-outreach.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template not found at ${templatePath}`);
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');

  // Load recipients
  const csvPath = path.resolve(args.input);
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: Input file not found: ${csvPath}`);
    process.exit(1);
  }
  let recipients = parseCsv(fs.readFileSync(csvPath, 'utf8'));

  if (!recipients.length) {
    console.error('Error: No valid recipients found in CSV (need shopName + email columns).');
    process.exit(1);
  }

  if (args.limit) recipients = recipients.slice(0, args.limit);

  const from = args.from || DEFAULT_FROM;

  console.log(`\n  Premium Listing Outreach — ${siteConfig.displayName}`);
  console.log(`    Site:        ${args.site}`);
  console.log(`    Base URL:    ${BASE_URL}`);
  console.log(`    Mode:        ${args.dryRun ? 'DRY RUN (no emails sent)' : 'LIVE SEND'}`);
  console.log(`    Recipients:  ${recipients.length}`);
  console.log(`    From:        ${from}`);
  console.log(`    Subject:     ${SUBJECT}`);
  console.log('');

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const storeSlug = recipient.slugOverride || slugify(recipient.shopName);
    const unsubscribeUrl = `${UNSUBSCRIBE_BASE}?email=${encodeURIComponent(recipient.email)}&store=${encodeURIComponent(storeSlug)}`;
    const claimUrl = `${BASE_URL}/claim/${storeSlug}`;

    const html = template
      .replace(/\{\{STORE_SLUG\}\}/g, storeSlug)
      .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

    if (args.dryRun) {
      console.log(`[DRY RUN]  ${recipient.email.padEnd(40)} shop="${recipient.shopName}"  slug=${storeSlug}  claim=${claimUrl}`);
      sent++;
      continue;
    }

    try {
      const result = await sendViaResend(recipient.email, SUBJECT, html, from);
      console.log(`sent    ${recipient.email.padEnd(40)} (${recipient.shopName}) [id: ${result.id}]`);
      sent++;
    } catch (err) {
      console.error(`failed  ${recipient.email.padEnd(40)} (${recipient.shopName}): ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('── Summary ─────────────────────────────────────────');
  console.log(`   Sent:    ${sent}`);
  if (failed > 0) console.log(`   Failed:  ${failed}`);
  console.log(`   Total:   ${recipients.length}`);
  console.log('');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
