/**
 * Produkční server pro nasazení na server.
 * Slouží statické soubory z dist/ a API pro blog (data/posts.json) a nahrávání obrázků.
 *
 * Spuštění:
 *   npm run build
 *   node server.js
 *
 * Nebo s portem: PORT=8080 node server.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

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
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json')
const IMAGES_DIR = path.join(__dirname, 'dist', 'images')
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

  // GET /api/posts
  if (pathname === '/api/posts' && req.method === 'GET') {
    try {
      const raw = fs.existsSync(POSTS_FILE) ? fs.readFileSync(POSTS_FILE, 'utf8') : '[]'
      const data = JSON.parse(raw)
      const list = Array.isArray(data) ? data : []
      sendJson(res, 200, list)
    } catch (_) {
      sendJson(res, 500, { error: 'Chyba při čtení článků.' })
    }
    return
  }

  // POST /api/posts
  if (pathname === '/api/posts' && req.method === 'POST') {
    try {
      const body = await parseBody(req)
      const list = JSON.parse(body)
      if (!Array.isArray(list)) {
        sendJson(res, 400, { error: 'Očekává se pole článků.' })
        return
      }
      fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true })
      fs.writeFileSync(POSTS_FILE, JSON.stringify(list, null, 2), 'utf8')
      sendJson(res, 200, { ok: true })
    } catch (_) {
      sendJson(res, 400, { error: 'Neplatná data.' })
    }
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

server.listen(PORT, () => {
  console.log(`Elephants server: http://localhost:${PORT}`)
  console.log(`  Statika: dist/`)
  console.log(`  Články:  data/posts.json`)
})
