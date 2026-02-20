/**
 * Napojení na MariaDB – články blogu.
 * Konfigurace přes env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

import mysql from 'mysql2/promise'

const DB_HOST = process.env.DB_HOST || '10.50.0.5'
const DB_PORT = Number(process.env.DB_PORT) || 3306
const DB_USER = process.env.DB_USER || 'elephants'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'elephants'

let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

const TABLE = 'posts'

/** Vytvoří tabulku posts, pokud neexistuje */
export async function initSchema() {
  const p = getPool()
  await p.execute(`
    CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`title\` VARCHAR(500) NOT NULL,
      \`excerpt\` TEXT NOT NULL,
      \`body\` TEXT NOT NULL,
      \`date\` VARCHAR(10) NOT NULL,
      \`slug\` VARCHAR(255) NOT NULL,
      \`image\` VARCHAR(500) DEFAULT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

/**
 * Načte všechny články z DB (řazení podle data sestupně).
 * @returns {Promise<Array<{id, title, excerpt, body, date, slug, image}>>}
 */
export async function getPosts() {
  const p = getPool()
  const [rows] = await p.execute(
    `SELECT id, title, excerpt, body, date, slug, image FROM \`${TABLE}\` ORDER BY date DESC, id ASC`
  )
  return (rows || []).map((r) => ({
    id: r.id,
    title: r.title ?? '',
    excerpt: r.excerpt ?? '',
    body: r.body ?? '',
    date: r.date ?? '',
    slug: r.slug ?? '',
    image: r.image ?? null,
  }))
}

/**
 * Nahradí všechny články v DB zadaným polem.
 * @param {Array<{id, title, excerpt, body, date, slug, image}>} list
 */
export async function savePosts(list) {
  if (!Array.isArray(list)) throw new Error('Očekává se pole článků.')
  const p = getPool()
  const conn = await p.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(`DELETE FROM \`${TABLE}\``)
    if (list.length > 0) {
      const placeholders = list.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
      const values = list.flatMap((post) => [
        String(post.id),
        String(post.title ?? ''),
        String(post.excerpt ?? ''),
        String(post.body ?? ''),
        String(post.date ?? ''),
        String(post.slug ?? ''),
        post.image ? String(post.image) : null,
      ])
      await conn.execute(
        `INSERT INTO \`${TABLE}\` (id, title, excerpt, body, date, slug, image) VALUES ${placeholders}`,
        values
      )
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

/** Otestuje připojení k DB */
export async function testConnection() {
  const p = getPool()
  const [rows] = await p.execute('SELECT 1')
  return rows != null
}
