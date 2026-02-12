const STORAGE_KEY = 'elephants_blog_posts'

const DEFAULT_POSTS = [
  {
    id: '1',
    title: 'Úvodní trénink sezóny 2025',
    excerpt: 'První trénink v nové sezóně proběhne v sobotu. Všichni hráči jsou zváni.',
    body: 'Těšíme se na všechny členy klubu. Sraz na hřišti v 9:00. Přineste si pití a sportovní oblečení.',
    date: '2025-02-01',
    slug: 'uvodni-trenink-sezony-2025',
  },
  {
    id: '2',
    title: 'Zápas s Lokomotivou',
    excerpt: 'Oznamujeme termín přátelského zápasu s týmem Lokomotiva.',
    body: 'Přátelský zápas se uskuteční v neděli 15. 2. 2025. Místo konání: naše hřiště. Začátek v 14:00.',
    date: '2025-02-10',
    slug: 'zapas-s-lokomotivou',
  },
  {
    id: '3',
    title: 'Vítejte na stránkách Kroměříž Elephants',
    excerpt: 'Klub amerického fotbalu Kroměříž Elephants vás vítá.',
    body: 'Jsme amatérský klub amerického fotbalu. Trénujeme pravidelně a účastníme se ligových i přátelských zápasů. Chcete-li se přidat, napište nám nebo přijďte na trénink.',
    date: '2025-01-15',
    slug: 'vitejte-elephants',
  },
]

let cache = null

/**
 * Načte články ze serveru (soubor na serveru). Volat při startu stránky.
 * Při chybě použije localStorage nebo DEFAULT_POSTS.
 * @returns {Promise<Array>}
 */
export async function loadPostsFromServer() {
  try {
    const res = await fetch('/api/posts')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length >= 0) {
        cache = data
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (_) {}
        return data
      }
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        cache = parsed
        return parsed
      }
    }
  } catch (_) {}
  cache = DEFAULT_POSTS
  return DEFAULT_POSTS
}

/**
 * Synchronní getter – vrací naposledy načtené články (po loadPostsFromServer) nebo výchozí.
 */
export function getPosts() {
  if (cache !== null) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_) {}
  return DEFAULT_POSTS
}

/**
 * Uloží články na server (soubor). Při chybě uloží jen do localStorage.
 * @param {Array} posts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function savePostsToServer(posts) {
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(posts),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      cache = posts
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
      } catch (_) {}
      return { ok: true }
    }
    return { ok: false, error: data.error || 'Chyba ukládání' }
  } catch (_) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
      cache = posts
    } catch (__) {}
    return { ok: false, error: 'Připojení k serveru selhalo. Data jsou uložena jen lokálně.' }
  }
}

export function getPostBySlug(slug) {
  return getPosts().find((p) => p.slug === slug) || null
}

export function getPostById(id) {
  return getPosts().find((p) => p.id === id) || null
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function createPost({ title, excerpt, body, date, image }) {
  const slug = slugify(title)
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  return { id, title, excerpt, body, date, slug, image: image?.trim() || null }
}

export function updatePost(posts, id, { title, excerpt, body, date, image }) {
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return posts
  const slug = slugify(title)
  const next = [...posts]
  next[index] = { ...next[index], title, excerpt, body, date, slug, image: image?.trim() || null }
  return next
}

export function deletePost(posts, id) {
  return posts.filter((p) => p.id !== id)
}
