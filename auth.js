/**
 * Přihlášení do administrace – ověření na serveru, heslo z .env.
 * Používá se v server.js i ve Vite dev middleware.
 */

import crypto from 'node:crypto'

export const ADMIN_USER = process.env.ADMIN_USER || 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
export const SESSION_COOKIE = 'elephants_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 h
const SECRET = ADMIN_PASSWORD || 'dev-secret'

export function signSession(payload) {
  const str = JSON.stringify(payload)
  const b64 = Buffer.from(str, 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifySession(cookieVal) {
  if (!cookieVal || typeof cookieVal !== 'string') return null
  const dot = cookieVal.indexOf('.')
  if (dot === -1) return null
  const b64 = cookieVal.slice(0, dot)
  const sig = cookieVal.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload.user ?? null
  } catch (_) {
    return null
  }
}

export function getSessionUser(req) {
  const cookie = req.headers?.cookie || ''
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  return verifySession(match ? decodeURIComponent(match[1]) : null)
}

export function createSessionPayload(user) {
  return { user: String(user).trim(), exp: Date.now() + SESSION_MAX_AGE * 1000 }
}

export const SESSION_MAX_AGE_SEC = SESSION_MAX_AGE
