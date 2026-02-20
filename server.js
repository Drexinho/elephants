import 'dotenv/config'

/**
 * Produkční server pro nasazení na server.
 * Slouží statické soubory z dist/ a API pro blog (MariaDB).
 *
 * Spuštění:
 *   npm run build
 *   DB_PASSWORD=xxx node server.js
 *
 * Nebo s portem: PORT=8080 node server.js
 * DB: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (výchozí 10.50.0.5, elephants, elephants)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import multiparty from 'multiparty'
import * as db from './db.js'
import {
  ADMIN_USER,
  ADMIN_PASSWORD,
  SESSION_COOKIE,
  signSession,
  getSessionUser,
  createSessionPayload,
  SESSION_MAX_AGE_SEC,
} from './auth.js'
import {
  getClientIp,
  getBlockStatus,
  recordFailedLogin,
  recordSuccess,
} from './login-limiter.js'

function requireAuth(req, res, onOk) {
  const user = getSessionUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Přihlášení vypršelo. Přihlaste se znovu.' })
    return
  }
  onOk(user)
}

/** Slouží soubor s podporou Range (206) – nutné pro přehrávání videa na mobilu */
function serveFileWithRange(req, res, filePath, contentType) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404)
      res.end()
      return
    }
    const size = stat.size
    const range = req.headers.range
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/)
      if (match) {
        const start = match[1] === '' ? 0 : parseInt(match[1], 10)
        const end = match[2] === '' ? size - 1 : parseInt(match[2], 10)
        const len = end - start + 1
        const stream = fs.createReadStream(filePath, { start, end })
        res.writeHead(206, {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': len,
        })
        stream.pipe(res)
        return
      }
    }
    res.setHeader('Accept-Ranges', 'bytes')
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': size })
    fs.createReadStream(filePath).pipe(res)
  })
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')
const PUBLIC_VIDEOS_DIR = path.join(__dirname, 'public', 'videos')
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10 MB
const PORT = Number(process.env.PORT) || 5175

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost`)
  const pathname = url.pathname.replace(/\/$/, '') || '/'
  const pathnameNorm = pathname === '/' ? '/index.html' : pathname

  // GET /api/posts – veřejné (blog načítá články)
  if (pathname === '/api/posts' && req.method === 'GET') {
    try {
      const list = await db.getPosts()
      sendJson(res, 200, list)
    } catch (err) {
      console.error('GET /api/posts:', err.message)
      sendJson(res, 500, { error: 'Chyba při čtení článků z databáze.' })
    }
    return
  }

  // POST /api/login – přihlášení do administrace (heslo jen na serveru v .env) + brute-force ochrana
  if (pathname === '/api/login' && req.method === 'POST') {
    const ip = getClientIp(req)
    const { blocked, retryAfterSec } = getBlockStatus(ip)
    if (blocked) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec || 900),
      })
      res.end(JSON.stringify({ error: 'Příliš mnoho neúspěšných pokusů. Zkuste to znovu později.' }))
      return
    }
    try {
      const body = await parseBody(req)
      const { user, password } = JSON.parse(body || '{}')
      if (String(user).trim() !== ADMIN_USER || password !== ADMIN_PASSWORD) {
        recordFailedLogin(ip)
        sendJson(res, 401, { error: 'Nesprávné přihlašovací údaje.' })
        return
      }
      recordSuccess(ip)
      const payload = createSessionPayload(String(user).trim())
      const token = signSession(payload)
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}`)
      sendJson(res, 200, { ok: true, user: payload.user })
    } catch (_) {
      sendJson(res, 400, { error: 'Neplatná data.' })
    }
    return
  }

  // GET /api/me – zda je uživatel přihlášen (pro admin stránku)
  if (pathname === '/api/me' && req.method === 'GET') {
    const user = getSessionUser(req)
    if (!user) {
      sendJson(res, 401, { error: 'Nejste přihlášen.' })
      return
    }
    sendJson(res, 200, { user })
    return
  }

  // POST /api/logout
  if (pathname === '/api/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    sendJson(res, 200, { ok: true })
    return
  }

  // POST /api/posts – jen pro přihlášené
  if (pathname === '/api/posts' && req.method === 'POST') {
    requireAuth(req, res, async () => {
      try {
        const body = await parseBody(req)
        const list = JSON.parse(body)
        if (!Array.isArray(list)) {
          sendJson(res, 400, { error: 'Očekává se pole článků.' })
          return
        }
        await db.savePosts(list)
        sendJson(res, 200, { ok: true })
      } catch (err) {
        console.error('POST /api/posts:', err.message)
        if (err.message === 'Očekává se pole článků.') {
          sendJson(res, 400, { error: err.message })
        } else {
          sendJson(res, 500, { error: 'Chyba při ukládání článků do databáze.' })
        }
      }
    })
    return
  }

  // POST /api/upload – jen pro přihlášené
  if (pathname === '/api/upload' && req.method === 'POST') {
    const user = getSessionUser(req)
    if (!user) {
      sendJson(res, 401, { error: 'Přihlášení vypršelo. Přihlaste se znovu.' })
      return
    }
    const form = new multiparty.Form({ maxFilesSize: MAX_UPLOAD_SIZE, autoFiles: true })
    form.parse(req, (err, _fields, files) => {
      if (err) {
        const msg = err.message && (err.message.includes('maxFilesSize') || err.message.includes('limit'))
          ? 'Soubor je příliš velký (max 10 MB).'
          : 'Chyba při nahrávání.'
        sendJson(res, 400, { error: msg })
        return
      }
      const fileList = files.file || files.image || files.imageFile
      if (!fileList?.length || !fileList[0].path) {
        sendJson(res, 400, { error: 'Žádný soubor' })
        return
      }
      const tmpPath = fileList[0].path
      const originalFilename = fileList[0].originalFilename || 'image'
      const ext = (path.extname(originalFilename).toLowerCase() || '.jpg').replace(/[^a-z.]/g, '')
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        sendJson(res, 400, { error: 'Povolené formáty: JPG, PNG, GIF, WEBP' })
        return
      }
      const name = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
      const destDir = UPLOADS_DIR
      const destPath = path.join(destDir, name)
      try {
        fs.mkdirSync(destDir, { recursive: true })
        fs.copyFileSync(tmpPath, destPath)
        sendJson(res, 200, { url: `/uploads/${name}` })
      } catch (e) {
        sendJson(res, 500, { error: 'Chyba při ukládání souboru.' })
      }
    })
    return
  }

  // Statické obrázky z uploads/ (nahrané k článkům)
  if (pathname.startsWith('/uploads/')) {
    const subPath = pathname.slice('/uploads/'.length).replace(/\.\./g, '')
    if (!subPath) {
      res.writeHead(404)
      res.end()
      return
    }
    const filePath = path.join(UPLOADS_DIR, subPath)
    if (!path.resolve(filePath).startsWith(path.resolve(UPLOADS_DIR))) {
      res.writeHead(403)
      res.end()
      return
    }
    fs.readFile(filePath, (err, data) => {
      if (err || !data) {
        res.writeHead(404)
        res.end()
        return
      }
      const ext = path.extname(filePath)
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
      res.end(data)
    })
    return
  }

  // Úvodní / hero videa z public/videos (s Range pro mobil)
  if (pathname.startsWith('/videos/')) {
    let subPath = pathname.slice('/videos/'.length).replace(/\.\./g, '')
    try { subPath = decodeURIComponent(subPath) } catch (_) {}
    const filePath = path.join(PUBLIC_VIDEOS_DIR, subPath)
    if (!filePath.startsWith(PUBLIC_VIDEOS_DIR) || !subPath) {
      res.writeHead(403)
      res.end()
      return
    }
    const contentType = MIME[path.extname(filePath)] || 'application/octet-stream'
    serveFileWithRange(req, res, filePath, contentType)
    return
  }

  // Statické soubory z dist/
  const filePath = path.join(DIST_DIR, pathnameNorm.replace(/^\//, '').replace(/\.\./g, ''))
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    res.end()
    return
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (pathnameNorm.endsWith('.html')) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('404 Not Found')
      } else {
        res.writeHead(404)
        res.end()
      }
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  })
})

async function start() {
  try {
    await db.initSchema()
    console.log('Databáze: tabulka posts připravena')
  } catch (err) {
    console.error('Chyba inicializace DB:', err.message)
    console.error('Zkontrolujte DB_HOST, DB_USER, DB_PASSWORD, DB_NAME a že databáze elephants existuje.')
    process.exit(1)
  }
  server.listen(PORT, () => {
    console.log(`Elephants server: http://localhost:${PORT}`)
    console.log(`  Statika: dist/`)
    console.log(`  Články:  MariaDB (elephants.posts)`)
  })
}

start()
