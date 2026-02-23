<?php
/**
 * Napojení na MariaDB – články blogu.
 * Stejná konfigurace jako Node: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

$GLOBALS['_db_pdo'] = null;

function db_get_pdo(): PDO {
    if ($GLOBALS['_db_pdo'] !== null) {
        return $GLOBALS['_db_pdo'];
    }
    $host = getenv('DB_HOST') ?: '10.50.0.5';
    $port = (int)(getenv('DB_PORT') ?: 3306);
    $user = getenv('DB_USER') ?: 'elephants';
    $pass = getenv('DB_PASSWORD') ?: '';
    $name = getenv('DB_NAME') ?: 'elephants';
    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
    $GLOBALS['_db_pdo'] = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    return $GLOBALS['_db_pdo'];
}

const DB_TABLE = 'posts';

/**
 * Vytvoří tabulku posts, pokud neexistuje (stejné schéma jako Node).
 */
function db_init_schema(): void {
    $pdo = db_get_pdo();
    $table = DB_TABLE;
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `$table` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `excerpt` TEXT NOT NULL,
  `body` TEXT NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
    );
}

/**
 * Načte všechny články (řazení podle data sestupně).
 * @return array<int, array{id: string, title: string, excerpt: string, body: string, date: string, slug: string, image: ?string}>
 */
function db_get_posts(): array {
    $pdo = db_get_pdo();
    $table = DB_TABLE;
    $stmt = $pdo->query("SELECT id, title, excerpt, body, date, slug, image FROM `$table` ORDER BY date DESC, id ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id' => $r['id'] ?? '',
            'title' => $r['title'] ?? '',
            'excerpt' => $r['excerpt'] ?? '',
            'body' => $r['body'] ?? '',
            'date' => $r['date'] ?? '',
            'slug' => $r['slug'] ?? '',
            'image' => isset($r['image']) && $r['image'] !== '' ? $r['image'] : null,
        ];
    }
    return $out;
}

/**
 * Nahradí všechny články v DB zadaným polem (stejná logika jako Node).
 * @param list<array{id: string, title: string, excerpt: string, body: string, date: string, slug: string, image: ?string}> $list
 */
function db_save_posts(array $list): void {
    $pdo = db_get_pdo();
    $table = DB_TABLE;
    $pdo->beginTransaction();
    try {
        $pdo->exec("DELETE FROM `$table`");
        if (count($list) > 0) {
            $placeholders = implode(', ', array_fill(0, count($list), '(?, ?, ?, ?, ?, ?, ?)'));
            $sql = "INSERT INTO `$table` (id, title, excerpt, body, date, slug, image) VALUES $placeholders";
            $stmt = $pdo->prepare($sql);
            $params = [];
            foreach ($list as $post) {
                $params[] = (string)($post['id'] ?? '');
                $params[] = (string)($post['title'] ?? '');
                $params[] = (string)($post['excerpt'] ?? '');
                $params[] = (string)($post['body'] ?? '');
                $params[] = (string)($post['date'] ?? '');
                $params[] = (string)($post['slug'] ?? '');
                $params[] = isset($post['image']) && $post['image'] !== '' ? (string)$post['image'] : null;
            }
            $stmt->execute($params);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
