import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multiparty from 'multiparty'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, 'public', 'images')
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json')

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function postsApiMiddleware(req, res, next) {
  const pathname = req.url?.split('?')[0]
  if (pathname !== '/api/posts') return next()

  if (req.method === 'GET') {
    try {
      const raw = fs.existsSync(POSTS_FILE) ? fs.readFileSync(POSTS_FILE, 'utf8') : '[]'
      const data = JSON.parse(raw)
      const list = Array.isArray(data) ? data : []
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(list))
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Chyba při čtení článků.' }))
    }
    return
  }

  if (req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const list = JSON.parse(body)
        if (!Array.isArray(list)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Očekává se pole článků.' }))
          return
        }
        fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true })
        fs.writeFileSync(POSTS_FILE, JSON.stringify(list, null, 2), 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Neplatná data.' }))
      }
    })
    return
  }

  next()
}

function uploadMiddleware(req, res, next) {
  const pathname = req.url?.split('?')[0]
  if (pathname !== '/api/upload' || req.method !== 'POST') return next()

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
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg'
    if (!/^\.(jpe?g|png|gif|webp)$/.test(ext)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Povolené formáty: JPG, PNG, GIF, WEBP' }))
      return
    }
    const name = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    const dest = path.join(IMAGES_DIR, name)
    fs.copyFileSync(tmpPath, dest)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ url: `/images/${name}` }))
  })
}

export default defineConfig({
  base: './',
  server: {
    port: 5175,
  },
  build: {
    rollupOptions: {
      input: ['index.html', 'blog.html', 'admin.html'],
    },
  },
  plugins: [
    {
      name: 'upload-api',
      enforce: 'pre',
      configureServer(server) {
        server.middlewares.use(postsApiMiddleware)
        server.middlewares.use(uploadMiddleware)
      },
    },
  ],
})
