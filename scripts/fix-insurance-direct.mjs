/**
 * Phase 1 fix: set ins: true for all known insurance-direct chains.
 * Run: node scripts/fix-insurance-direct.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOP_FILE = join(__dirname, '../src/data/shops.js');

const INSURANCE_DIRECT_PATTERNS = [
  /safelite/i,
  /glass\s+doctor/i,
  /novus\s+glass/i,
  /auto\s+glass\s+now/i,
  /mister\s+glass/i,
  /windshieldhub/i,
  /gerber\s+collision/i,
  /service\s+king\s+glass/i,
  /national\s+auto\s+glass/i,
  /\binsurance\b/i,
  /direct\s+billing/i,
];

function matchesChain(name) {
  return INSURANCE_DIRECT_PATTERNS.some((p) => p.test(name));
}

const content = readFileSync(SHOP_FILE, 'utf8');
const lines = content.split('\n');

const originalTrueCount = (content.match(/\bins:\s*true/g) || []).length;

let currentShopMatches = false;
const updatedLines = [];
let updatedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect start of a shop record
  if (/^\s*\{\s*i:\s*"/.test(line) && /n:\s*"/.test(line)) {
    const nameMatch = line.match(/n:\s*"([^"]+)"/);
    currentShopMatches = nameMatch ? matchesChain(nameMatch[1]) : false;
    updatedLines.push(line);
    continue;
  }

  // Detect the ins: field line
  if (/\bins:\s*(true|false)/.test(line)) {
    if (currentShopMatches && /\bins:\s*false/.test(line)) {
      updatedLines.push(line.replace(/\bins:\s*false/, 'ins: true'));
      updatedCount++;
    } else {
      updatedLines.push(line);
    }
    // Reset after processing ins field (done with this shop's key field)
    currentShopMatches = false;
    continue;
  }

  updatedLines.push(line);
}

const newContent = updatedLines.join('\n');
const newTrueCount = (newContent.match(/\bins:\s*true/g) || []).length;

writeFileSync(SHOP_FILE, newContent, 'utf8');

console.log('=== Insurance Direct Bulk Update ===');
console.log(`Before: ${originalTrueCount} shops with ins: true`);
console.log(`After:  ${newTrueCount} shops with ins: true`);
console.log(`Updated: ${updatedCount} shops flipped false → true`);
console.log(`Total shops: 2810`);
console.log(`Coverage: ${((newTrueCount / 2810) * 100).toFixed(1)}%`);
