import 'dotenv/config'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multiparty from 'multiparty'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json')

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/** Čte/zapisuje články – preferuje MariaDB (db.js), při chybě fallback na data/posts.json */
async function getPostsList() {
  try {
    const { getPosts } = await import('./db.js')
    return await getPosts()
  } catch (_) {
    const raw = fs.existsSync(POSTS_FILE) ? fs.readFileSync(POSTS_FILE, 'utf8') : '[]'
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  }
}

async function savePostsList(list) {
  try {
    const { savePosts } = await import('./db.js')
    await savePosts(list)
    return true
  } catch (_) {
    fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true })
    fs.writeFileSync(POSTS_FILE, JSON.stringify(list, null, 2), 'utf8')
    return true
  }
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function authApiMiddleware(req, res, next) {
  const pathname = req.url?.split('?')[0]

  if (pathname === '/api/me' && req.method === 'GET') {
    const user = getSessionUser(req)
    if (!user) return sendJson(res, 401, { error: 'Nejste přihlášen.' })
    return sendJson(res, 200, { user })
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    return sendJson(res, 200, { ok: true })
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      const ip = getClientIp(req)
      const { blocked, retryAfterSec } = getBlockStatus(ip)
      if (blocked) {
        res.statusCode = 429
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Retry-After', String(retryAfterSec || 900))
        res.end(JSON.stringify({ error: 'Příliš mnoho neúspěšných pokusů. Zkuste to znovu později.' }))
        return
      }
      try {
        const { user, password } = JSON.parse(body || '{}')
        if (String(user).trim() !== ADMIN_USER || password !== ADMIN_PASSWORD) {
          recordFailedLogin(ip)
          return sendJson(res, 401, { error: 'Nesprávné přihlašovací údaje.' })
        }
        recordSuccess(ip)
        const payload = createSessionPayload(String(user).trim())
        const token = signSession(payload)
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}`)
        sendJson(res, 200, { ok: true, user: payload.user })
      } catch (_) {
        sendJson(res, 400, { error: 'Neplatná data.' })
      }
    })
    return
  }

  next()
}

function postsApiMiddleware(req, res, next) {
  const pathname = req.url?.split('?')[0]
  if (pathname !== '/api/posts') return next()

  if (req.method === 'GET') {
    getPostsList()
      .then((list) => sendJson(res, 200, list))
      .catch(() => sendJson(res, 500, { error: 'Chyba při čtení článků.' }))
    return
  }

  if (req.method === 'POST') {
    if (!getSessionUser(req)) {
      return sendJson(res, 401, { error: 'Přihlášení vypršelo. Přihlaste se znovu.' })
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const list = JSON.parse(body)
        if (!Array.isArray(list)) return sendJson(res, 400, { error: 'Očekává se pole článků.' })
        savePostsList(list)
          .then(() => sendJson(res, 200, { ok: true }))
          .catch(() => sendJson(res, 500, { error: 'Chyba při ukládání.' }))
      } catch (err) {
        sendJson(res, 400, { error: 'Neplatná data.' })
      }
    })
    return
  }

  next()
}

function uploadMiddleware(req, res, next) {
  const pathname = req.url?.split('?')[0]
  if (pathname !== '/api/upload' || req.method !== 'POST') return next()
  if (!getSessionUser(req)) {
    return sendJson(res, 401, { error: 'Přihlášení vypršelo. Přihlaste se znovu.' })
  }
  const form = new multiparty.Form({
    maxFilesSize: MAX_FILE_SIZE,
    autoFiles: true,
  })
  form.parse(req, (err, _fields, files) => {
    if (err) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      const msg = err.message && (err.message.includes('maxFilesSize') || err.message.includes('limit')) ? 'Soubor je příliš velký (max 10 MB).' : 'Chyba při nahrávání.'
      res.end(JSON.stringify({ error: msg }))
      return
    }
    const fileList = files.file || files.image || files.imageFile
    if (!fileList?.length || !fileList[0].path) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Žádný soubor' }))
      return
    }
    const { path: tmpPath, originalFilename } = fileList[0]
    const ext = (path.extname(originalFilename).toLowerCase() || '.jpg').replace(/[^a-z.]/g, '')
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Povolené formáty: JPG, PNG, GIF, WEBP' }))
      return
    }
    const name = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    const dest = path.join(UPLOADS_DIR, name)
    fs.copyFileSync(tmpPath, dest)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ url: `/uploads/${name}` }))
  })
}

export default defineConfig({
  base: './',
  server: {
    port: 5175,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: ['index.html', 'blog.html', 'admin.html'],
    },
  },
  plugins: [
    {
      name: 'upload-api',
      enforce: 'pre',
      configureServer(server) {
        server.middlewares.use(authApiMiddleware)
        // Servírování nahraných obrázků z uploads/
        server.middlewares.use((req, res, next) => {
          const pathname = req.url?.split('?')[0] || ''
          if (!pathname.startsWith('/uploads/')) return next()
          const name = pathname.slice('/uploads/'.length).replace(/\.\./g, '')
          if (!name) return next()
          const filePath = path.join(UPLOADS_DIR, name)
          if (!filePath.startsWith(UPLOADS_DIR)) return next()
          fs.readFile(filePath, (err, data) => {
            if (err || !data) {
              res.statusCode = 404
              res.end()
              return
            }
            const ext = path.extname(filePath)
            const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream'
            res.setHeader('Content-Type', mime)
            res.end(data)
          })
        })
        server.middlewares.use(postsApiMiddleware)
        server.middlewares.use(uploadMiddleware)
      },
    },
  ],
})
