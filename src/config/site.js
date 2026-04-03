/**
 * Site configuration — change these values to launch a new niche directory.
 * All niche-specific strings, branding, and SEO settings live here.
 */
export const siteConfig = {
  // ── Core identity ──────────────────────────────────────────────────────────
  domain: "https://www.shieldfinder.com",
  name: "ShieldFinder",
  displayName: "ShieldFinder",
  tagline: "Find Auto Glass Repair Shops Near You",
  niche: "auto glass repair",

  // ── Branding ───────────────────────────────────────────────────────────────
  icon: "🛡️",
  primaryColor: "#0369A1",
  accentColor: "#06B6D4",
  heroGradient: "linear-gradient(160deg, #ffffff 0%, #E0F2FE 100%)",

  // ── SEO ────────────────────────────────────────────────────────────────────
  seo: {
    title: "Auto Glass Repair Shops Near You | ShieldFinder",
    description:
      "Find verified auto glass repair shops near you. Compare windshield replacement, chip repair, and ADAS recalibration services. Insurance direct billing available.",
    keywords:
      "auto glass repair, windshield replacement, chip repair, auto glass near me, windshield repair, car glass replacement, ADAS recalibration",
    googleVerification: "",
    ogTitle: "Auto Glass Repair Shops | ShieldFinder",
    ogDescription:
      "The most complete directory of auto glass repair shops in the US. Find shops with insurance direct billing and mobile service.",
  },

  // ── Analytics / Ads ────────────────────────────────────────────────────────
  analytics: {
    ga4Id: "G-GZ3W60WB6N",
    adsenseClient: "ca-pub-6583010255692976",
    adSlots: {
      homepageBelowHero: "",    // Fill in after AdSense approval — create unit in AdSense > Ads > By ad unit
      homepageBelowListings: "", // Fill in after AdSense approval
    },
  },

  // ── Listing copy ───────────────────────────────────────────────────────────
  listing: {
    singular: "shop",
    plural: "shops",
    savingsBadge: "🛡️ Windshield Replacement & Chip Repair",
    savingsRange: "Insurance Direct Billing",
    avgRating: "4.7",
    heroSubtext: "verified shops across",
    schemaBusinessType: "AutoRepair",
    categoryLabel: "Auto Glass Repair",
    metaSavings: "Windshield replacement, chip repair, and ADAS recalibration.",
    quoteFormItems: [
      "Windshield Replacement",
      "Chip / Crack Repair",
      "Side Window",
      "Rear Window",
      "ADAS Recalibration",
    ],
  },

  // ── Route prefix ───────────────────────────────────────────────────────────
  listingsRoute: "shops",

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    description: "The most complete directory of auto glass repair shops in the US.",
    copyright: "ShieldFinder.com",
  },
};

export default siteConfig;
