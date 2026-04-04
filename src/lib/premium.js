/**
 * Premium shop state helpers using Vercel KV.
 * Key pattern: premium:sf:{shopId}
 * Value: { subscriptionId, email, since, active }
 */

const KV_PREFIX = 'premium:sf';

async function kv() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

export async function isPremium(shopId) {
  try {
    const store = await kv();
    const record = await store.get(`${KV_PREFIX}:${shopId}`);
    return record?.active === true;
  } catch {
    return false;
  }
}

export async function setPremium(shopId, { subscriptionId, email }) {
  const store = await kv();
  await store.set(`${KV_PREFIX}:${shopId}`, {
    subscriptionId,
    email,
    since: new Date().toISOString(),
    active: true,
  });
}

export async function revokePremium(shopId) {
  try {
    const store = await kv();
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
    const store = await kv();
    return await store.get(`${KV_PREFIX}:${shopId}`);
  } catch {
    return null;
  }
}
