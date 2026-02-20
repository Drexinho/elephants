/**
 * Ochrana proti brute-force na /api/login – po N neúspěšných pokusech
 * z jedné IP dočasné zablokování (bez systémového fail2ban).
 *
 * Konfigurace: LOGIN_MAX_ATTEMPTS (výchozí 5), LOGIN_BLOCK_MINUTES (výchozí 15).
 */

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5
const BLOCK_MS = (Number(process.env.LOGIN_BLOCK_MINUTES) || 15) * 60 * 1000

/** ip -> { count, blockedUntil } */
const store = new Map()

function getKey(ip) {
  return ip && typeof ip === 'string' ? ip.trim() : null
}

/**
 * Vrací IP klienta z requestu (bere v potaz proxy X-Forwarded-For, X-Real-IP).
 * @param {import('http').IncomingMessage} req
 */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]
    if (first) return first.trim()
  }
  const real = req.headers?.['x-real-ip']
  if (real && typeof real === 'string') return real.trim()
  const addr = req.socket?.remoteAddress
  if (addr) return addr
  return null
}

/**
 * Je IP momentálně zablokovaná?
 * @returns {{ blocked: boolean, retryAfterSec?: number }}
 */
export function getBlockStatus(ip) {
  const key = getKey(ip)
  if (!key) return { blocked: false }
  const entry = store.get(key)
  if (!entry) return { blocked: false }
  const now = Date.now()
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { blocked: true, retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000) }
  }
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    store.delete(key)
    return { blocked: false }
  }
  return { blocked: false }
}

/** Zaznamenat neúspěšný pokus o přihlášení. */
export function recordFailedLogin(ip) {
  const key = getKey(ip)
  if (!key) return
  const entry = store.get(key) || { count: 0, blockedUntil: null }
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_MS
  }
  store.set(key, entry)
}

/** Po úspěšném přihlášení vynulovat počítadlo pro IP. */
export function recordSuccess(ip) {
  const key = getKey(ip)
  if (key) store.delete(key)
}

/** Pro úklid: odstranit staré záznamy (volatelné periodicky). */
export function pruneExpired() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.blockedUntil && entry.blockedUntil < now) store.delete(key)
  }
}
