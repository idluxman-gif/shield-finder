/**
 * Premium shop state helpers using Vercel KV.
 * Key pattern: premium:sf:{shopId}
 * Value: { paymentId, email, ownerEmail, since, expiresAt, active }
 *
 * Gumroad doesn't have native recurring billing tracking on our end, so we track a 32-day
 * expiry. When the listing expires the upgrade CTA reappears so the owner
 * can renew for another month.
 */

const KV_PREFIX = 'premium:sf';
const PREMIUM_DAYS = 32;

async function getKv() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

export async function isPremium(shopId) {
  try {
    const store = await getKv();
    const record = await store.get(`${KV_PREFIX}:${shopId}`);
    if (!record?.active) return false;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function setPremium(shopId, { paymentId, email, ownerEmail }) {
  const store = await getKv();
  const since = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PREMIUM_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await store.set(`${KV_PREFIX}:${shopId}`, {
    paymentId,
    email,
    ownerEmail: ownerEmail || null,
    since,
    expiresAt,
    active: true,
  });
}

export async function revokePremium(shopId) {
  try {
    const store = await getKv();
    const existing = await store.get(`${KV_PREFIX}:${shopId}`);
    if (existing) {
      await store.set(`${KV_PREFIX}:${shopId}`, { ...existing, active: false });
    }
  } catch (err) {
    console.error('[premium] revoke error:', err);
  }
}

export async function getPremiumRecord(shopId) {
  try {
    const store = await getKv();
    return await store.get(`${KV_PREFIX}:${shopId}`);
  } catch {
    return null;
  }
}
