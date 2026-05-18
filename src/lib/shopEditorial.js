/**
 * Per-shop editorial generator for ShieldFinder shop detail pages.
 *
 * Takes a shop record + its sibling shops in the same city + state and city
 * editorial context, and produces 3-5 paragraphs of substantive, useful
 * content that interpolates the shop's actual data (hours, services,
 * insurance flags, review volume, etc.).
 *
 * The output is per-shop unique enough that 2,810 shop pages don't read
 * as boilerplate, while still being templated so we don't have to write
 * each one by hand. This makes shop pages substantive enough to (a) lift
 * the AdSense quality signal, and (b) rank as standalone landing pages
 * for "{shop name} {city}" type searches that drive lead inquiries.
 */

import { stateNames, SERVICE_LABELS } from '@/data/shops';
import { stateEditorial } from '@/data/stateEditorial';
import { cityEditorial } from '@/data/cityEditorial';

const ZERO_DEDUCTIBLE_STATES = new Set(['FL', 'AZ', 'KY', 'SC', 'MA', 'NY']);

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Deterministic hash from shop ID — gives each shop a stable "slot" we use
// to vary text choices across the generator so similar-state shops don't
// produce near-identical pages (avoids Google's templated-content penalty).
function shopHash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function ratingTier(r) {
  if (r >= 4.8) return { label: 'top tier', detail: 'sits in the highest review-rating band' };
  if (r >= 4.5) return { label: 'highly rated', detail: 'rates well above the regional average for verified shops' };
  if (r >= 4.0) return { label: 'solidly rated', detail: 'rates in line with the better-reviewed shops in the area' };
  return { label: 'mid-range', detail: 'rates around the area average' };
}

function reviewVolumeTier(v) {
  if (v >= 1000) return 'high-volume operation with sustained customer history';
  if (v >= 300) return 'established operation with substantial review history';
  if (v >= 100) return 'mature shop with a meaningful review base';
  if (v >= 30) return 'shop with a developing review base';
  return 'newer or smaller-volume shop';
}

function hoursSummary(hours) {
  if (!hours) return null;
  const open = DAY_ORDER.filter(d => hours[d] && hours[d] !== 'Closed');
  if (open.length === 0) return 'currently closed for scheduled hours';

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const allWeekdaysOpen = weekdays.every(d => hours[d] && hours[d] !== 'Closed');
  const sat = hours['Saturday'] && hours['Saturday'] !== 'Closed';
  const sun = hours['Sunday'] && hours['Sunday'] !== 'Closed';

  let summary = '';
  if (allWeekdaysOpen) {
    const wkdayHrs = hours['Monday'];
    summary += `weekdays ${wkdayHrs.toLowerCase()}`;
  } else {
    summary += `selected weekdays only`;
  }
  if (sat && sun) summary += `, with weekend hours both Saturday and Sunday`;
  else if (sat) summary += `, with Saturday hours`;
  else if (sun) summary += `, with Sunday hours`;
  else summary += `, closed weekends`;
  return summary;
}

function serviceCallout(svcArr) {
  if (!svcArr || svcArr.length === 0) return null;
  const labels = svcArr.map(s => SERVICE_LABELS[s] || s).filter(Boolean);
  if (labels.length === 0) return null;
  if (labels.length === 1) return `services include ${labels[0].toLowerCase()}`;
  if (labels.length === 2) return `services include ${labels[0].toLowerCase()} and ${labels[1].toLowerCase()}`;
  const last = labels.pop();
  return `services include ${labels.map(l => l.toLowerCase()).join(', ')}, and ${last.toLowerCase()}`;
}

function insuranceLine(shop, stateCode, hash) {
  const isZeroDed = ZERO_DEDUCTIBLE_STATES.has(stateCode);
  const stateName = stateNames[stateCode];
  const insYesZD = [
    `Direct insurance billing is available, which matters in ${stateName} because the state's zero-deductible windshield law means most comprehensive policyholders pay nothing out of pocket for covered glass work — the shop bills your insurer directly and you're done.`,
    `Insurance is billed directly here. Combined with ${stateName}'s zero-deductible windshield rule, most drivers with comprehensive coverage walk out without writing a check.`,
    `The shop handles direct insurance billing — useful in ${stateName} where comprehensive coverage typically waives the deductible on windshield work entirely.`,
  ];
  const insYesNoZD = [
    `Direct insurance billing is available — the shop handles claim submission with your carrier rather than asking you to pay first and seek reimbursement, which simplifies the process if you're using comprehensive coverage.`,
    `The shop will bill your insurer directly. You confirm coverage with your carrier, give the shop your policy info, and they handle the paperwork.`,
    `Insurance is billed direct — no upfront payment and no reimbursement chase. The shop coordinates the claim with your carrier on your behalf.`,
  ];
  const insNoZD = [
    `This location does not currently advertise direct insurance billing. ${stateName}'s zero-deductible windshield law still applies — you can call your insurer first to confirm coverage and route the claim, then bring the work here, but you'll be coordinating between the two yourself.`,
    `Direct insurance billing isn't listed for this shop. You can still use your ${stateName} comprehensive coverage (which typically pays in full under the zero-deductible rule) — just call your carrier first to set up the claim and confirm out-of-network terms.`,
    `Insurance is not billed directly here. Given ${stateName}'s zero-deductible glass coverage, the workaround is to file the claim through your carrier first, get authorization, then have the work done.`,
  ];
  const insNoNoZD = [
    `This location does not currently advertise direct insurance billing. If you're filing a comprehensive claim, you may need to pay up front and submit for reimbursement — call your carrier first to confirm the process.`,
    `Insurance billing is not direct at this shop. For a comprehensive claim, expect to either pay out of pocket and submit for reimbursement or work with your carrier on a pre-approved payment.`,
    `The shop does not bill insurance directly. If you're using comprehensive coverage, contact your insurer first to determine whether to pay up front or coordinate payment some other way.`,
  ];
  const arr = shop.ins
    ? (isZeroDed ? insYesZD : insYesNoZD)
    : (isZeroDed ? insNoZD : insNoNoZD);
  return arr[hash % arr.length];
}

function mobileLine(shop, hash) {
  const mobileVariants = [
    `Mobile service is offered, meaning a technician can come to a home or workplace for chip repair and many replacement jobs — useful if a damaged windshield isn't safe to drive or if shop visits are inconvenient.`,
    `The shop runs mobile service, so a tech can come to your driveway or office for most jobs. Practical when the damage makes driving risky, or when scheduling a shop visit isn't realistic.`,
    `Mobile installs are available. The tech comes to you with the glass, adhesives, and recalibration equipment needed — works well for routine replacements and chip repairs.`,
  ];
  const shopOnlyVariants = [
    `Service is in-shop only — the vehicle needs to come to the location. For replacements, plan on at least an hour of dwell time plus the manufacturer-recommended safe-drive-away interval.`,
    `This shop doesn't offer mobile installs; vehicles come to the location. Most replacements take an hour or so in the bay, then the manufacturer's safe-drive-away time before you take the car back on the road.`,
    `In-shop service only. That's actually better for ADAS-equipped vehicles needing static recalibration, since the bay environment is more controlled than a driveway install.`,
  ];
  const arr = shop.mob ? mobileVariants : shopOnlyVariants;
  return arr[hash % arr.length];
}

function rankInCity(shop, cityShops) {
  const sorted = [...cityShops].sort((a, b) => (b.r * 100 + Math.log10(b.v + 1)) - (a.r * 100 + Math.log10(a.v + 1)));
  const idx = sorted.findIndex(s => s.i === shop.i);
  if (idx === -1) return null;
  const rank = idx + 1;
  const total = cityShops.length;
  if (rank === 1) return `On ShieldFinder it currently ranks as the top shop in ${shop.c} based on combined rating and review volume.`;
  if (rank <= 3) return `On ShieldFinder it currently ranks among the top three ${shop.c} shops by combined rating and review volume.`;
  if (rank / total <= 0.1) return `On ShieldFinder it currently sits in the top 10% of the ${total} ${shop.c} shops listed here.`;
  if (rank / total <= 0.25) return `On ShieldFinder it currently sits in the top quartile of the ${total} ${shop.c} shops listed here.`;
  return `On ShieldFinder it is one of ${total} verified shops we list in ${shop.c}.`;
}

/**
 * Generate editorial paragraphs for a shop. Returns an array of HTML paragraph
 * strings (already wrapped in implicit <p> tags by the consumer's renderer).
 */
export function generateShopEditorial(shop, cityShops) {
  const stateCode = shop.s;
  const stateName = stateNames[stateCode] || stateCode;
  const cityName = shop.c;
  const hash = shopHash(shop.i);

  const tier = ratingTier(shop.r);
  const volTier = reviewVolumeTier(shop.v);
  const rank = rankInCity(shop, cityShops);

  const stateContext = stateEditorial[stateCode] || null;
  const cityContext = cityEditorial[`${stateCode}-${cityName}`] || null;

  const paragraphs = [];

  // === Paragraph 1: Positioning ===
  // Intro phrasing varies by hash so 2,800 P1s don't open with identical syntax.
  const p1Intros = [
    `${shop.n} operates as an auto glass repair and replacement shop in ${cityName}, ${stateName}, holding`,
    `Based in ${cityName}, ${stateName}, ${shop.n} is an auto glass shop with`,
    `${shop.n} serves the ${cityName}, ${stateName} market for auto glass repair and replacement and carries`,
    `${shop.n} is a ${cityName}-based auto glass shop showing`,
  ];
  let p1 = `${p1Intros[hash % p1Intros.length]} a ${shop.r}★ aggregate rating across ${shop.v.toLocaleString()} verified customer reviews. By that measure, the location is ${tier.label} — it ${tier.detail} — and represents a ${volTier}.`;
  if (rank) {
    p1 += ` ${rank}`;
  }
  paragraphs.push(p1);

  // === Paragraph 2: Service capabilities ===
  const svcLine = serviceCallout(shop.svc);
  let p2 = `The shop's posted ${svcLine || 'services cover standard windshield repair and replacement work'}. ${insuranceLine(shop, stateCode, hash)} ${mobileLine(shop, hash)}`;
  paragraphs.push(p2);

  // === Paragraph 3: Operating context (hours + how to reach) ===
  const hrs = hoursSummary(shop.hours);
  let p3 = '';
  if (hrs) {
    p3 += `Operating schedule runs ${hrs}. `;
  }
  p3 += `${shop.n} can be reached at ${shop.p}`;
  if (shop.w) {
    try {
      const u = new URL(shop.w);
      p3 += ` or via their website at ${u.host.replace(/^www\./, '')}`;
    } catch (_) {
      p3 += ` or through their website`;
    }
  }
  p3 += `. Calling ahead to confirm same-day or next-day appointment availability is the most reliable approach, especially after major storm events when ${cityName}-area shops often see surge demand.`;
  paragraphs.push(p3);

  // === Paragraph 4: Local market context (state-specific) ===
  // Each state editorial has ~5-7 sentences. We pick TWO sentences for each
  // shop based on its hash, so different shops in the same state get a
  // genuinely different paragraph rather than the same first sentence
  // repeated across hundreds of pages.
  if (stateContext) {
    const sentences = stateContext.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
    const introVariants = [
      `Local market context for ${stateName} drivers:`,
      `For ${stateName} drivers specifically:`,
      `What's notable about the ${stateName} market:`,
      `${stateName} auto glass background:`,
      `Worth knowing for ${stateName} drivers:`,
    ];
    const intro = introVariants[hash % introVariants.length];
    if (sentences.length > 0) {
      const firstIdx = hash % sentences.length;
      const secondIdx = (hash + 1 + (hash % (sentences.length - 1 || 1))) % sentences.length;
      const picked = firstIdx === secondIdx
        ? sentences[firstIdx]
        : `${sentences[firstIdx]} ${sentences[secondIdx]}`;
      paragraphs.push(`${intro} ${picked}`);
    }
  }

  // === Paragraph 5: Wayfinding to better-context pages ===
  // Intro phrasing varies by shop hash so 2,800 shop pages don't all close
  // with the identical "For comparisons..." sentence.
  const stateSlug = stateCode.toLowerCase();
  const citySlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sibling = cityShops.length > 1 ? cityShops.length - 1 : 0;
  const wayfindingIntros = [
    `For comparisons with other auto glass options nearby,`,
    `If you want to weigh other ${cityName} shops side-by-side,`,
    `To compare this shop against the rest of the ${cityName} market,`,
    `Other ${cityName} auto glass options are listed on`,
    `If this isn't the right fit, browse`,
  ];
  const wayfindingIntro = wayfindingIntros[hash % wayfindingIntros.length];
  const verb = wayfindingIntro.endsWith(',') ? 'see' : '';
  let p5 = `${wayfindingIntro} ${verb}${verb ? ' ' : ''}the full <a href="/shops/${stateSlug}/${citySlug}/">${cityName} shop directory</a>${sibling > 0 ? ` (${sibling} other ${sibling === 1 ? 'shop' : 'shops'} listed)` : ''} or browse all <a href="/shops/${stateSlug}/">${stateName} shops</a> on ShieldFinder.`;
  if (cityContext) {
    const cityContextVariants = [
      `Background on what to expect from the ${cityName} auto glass market, including local damage drivers and insurance specifics, is on the city directory page.`,
      `The ${cityName} directory page covers the local damage profile, common insurance scenarios, and what separates a good ${cityName} shop from a bad one.`,
      `For deeper context on the ${cityName} auto glass scene — climate factors, insurance handling, ADAS availability — see the city directory page.`,
    ];
    p5 += ` ${cityContextVariants[hash % cityContextVariants.length]}`;
  }
  paragraphs.push(p5);

  return paragraphs;
}
