<?php
/**
 * Produkční vstupní bod – API a servírování statiky z dist/.
 * MariaDB napojení beze změny (stejné .env, stejné schéma).
 *
 * Požadavky: PHP 7.4+, PDO MySQL, rozšíření json, mbstring.
 * Apache: AllowOverride All, mod_rewrite. Nebo nginx – viz README.
 */

require_once __DIR__ . '/php/env.php';
require_once __DIR__ . '/php/db.php';
require_once __DIR__ . '/php/auth.php';
require_once __DIR__ . '/php/login-limiter.php';

$ROOT = __DIR__;
$DIST_DIR = $ROOT . '/dist';
$UPLOADS_DIR = $ROOT . '/uploads';
$VIDEOS_DIR = $ROOT . '/public/videos';
$MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = '/' . trim($path, '/');
if ($path === '') {
    $path = '/';
}
$pathNorm = $path === '/' ? '/index.html' : $path;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$sendJson = function (int $status, $data): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
};

// --- API: GET /api/posts
if ($path === '/api/posts' && $method === 'GET') {
    try {
        db_init_schema();
        $list = db_get_posts();
        $sendJson(200, $list);
    } catch (Throwable $e) {
        error_log('GET /api/posts: ' . $e->getMessage());
        $sendJson(500, ['error' => 'Chyba při čtení článků z databáze.']);
    }
}

// --- API: POST /api/login
if ($path === '/api/login' && $method === 'POST') {
    $ip = login_limiter_get_client_ip();
    $status = login_limiter_get_block_status($ip);
    if (!empty($status['blocked'])) {
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: ' . (string)($status['retryAfterSec'] ?? 900));
        echo json_encode(['error' => 'Příliš mnoho neúspěšných pokusů. Zkuste to znovu později.']);
        exit;
    }
    $body = (string)file_get_contents('php://input');
    $input = json_decode($body, true);
    $user = isset($input['user']) ? trim((string)$input['user']) : '';
    $password = isset($input['password']) ? (string)$input['password'] : '';
    if ($user !== AUTH_ADMIN_USER || $password !== AUTH_ADMIN_PASSWORD) {
        login_limiter_record_failed($ip);
        $sendJson(401, ['error' => 'Nesprávné přihlašovací údaje.']);
    }
    login_limiter_record_success($ip);
    $payload = auth_create_payload($user);
    $token = auth_sign_session($payload);
    header('Set-Cookie: ' . AUTH_SESSION_COOKIE . '=' . rawurlencode($token) . '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' . AUTH_SESSION_MAX_AGE);
    $sendJson(200, ['ok' => true, 'user' => $payload['user']]);
}

// --- API: GET /api/me
if ($path === '/api/me' && $method === 'GET') {
    $user = auth_get_session_user();
    if ($user === null) {
        $sendJson(401, ['error' => 'Nejste přihlášen.']);
    }
    $sendJson(200, ['user' => $user]);
}

// --- API: POST /api/logout
if ($path === '/api/logout' && $method === 'POST') {
    header('Set-Cookie: ' . AUTH_SESSION_COOKIE . '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    $sendJson(200, ['ok' => true]);
}

// --- API: POST /api/posts (pouze přihlášený)
if ($path === '/api/posts' && $method === 'POST') {
    $user = auth_get_session_user();
    if ($user === null) {
        $sendJson(401, ['error' => 'Přihlášení vypršelo. Přihlaste se znovu.']);
    }
    $body = (string)file_get_contents('php://input');
    $list = json_decode($body, true);
    if (!is_array($list)) {
        $sendJson(400, ['error' => 'Očekává se pole článků.']);
    }
    try {
        db_init_schema();
        db_save_posts($list);
        $sendJson(200, ['ok' => true]);
    } catch (Throwable $e) {
        error_log('POST /api/posts: ' . $e->getMessage());
        $sendJson(500, ['error' => 'Chyba při ukládání článků do databáze.']);
    }
}

// --- API: POST /api/upload (pouze přihlášený)
if ($path === '/api/upload' && $method === 'POST') {
    $user = auth_get_session_user();
    if ($user === null) {
        $sendJson(401, ['error' => 'Přihlášení vypršelo. Přihlaste se znovu.']);
    }
    $file = $_FILES['file'] ?? $_FILES['image'] ?? $_FILES['imageFile'] ?? null;
    if (!$file || empty($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        $sendJson(400, ['error' => 'Žádný soubor']);
    }
    if ($file['size'] > $MAX_UPLOAD_SIZE) {
        $sendJson(400, ['error' => 'Soubor je příliš velký (max 10 MB).']);
    }
    $orig = $file['name'] ?? 'image';
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    $ext = preg_replace('/[^a-z]/', '', $ext) ?: 'jpg';
    if (!in_array('.' . $ext, ['.jpg', '.jpeg', '.png', '.gif', '.webp'], true)) {
        $sendJson(400, ['error' => 'Povolené formáty: JPG, PNG, GIF, WEBP']);
    }
    $name = 'blog-' . (string)((int)(microtime(true) * 1000)) . '-' . bin2hex(random_bytes(5)) . '.' . $ext;
    if (!is_dir($UPLOADS_DIR)) {
        mkdir($UPLOADS_DIR, 0755, true);
    }
    $dest = $UPLOADS_DIR . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        $sendJson(500, ['error' => 'Chyba při ukládání souboru.']);
    }
    $sendJson(200, ['url' => '/uploads/' . $name]);
}

// --- Služba /uploads/*
if (strpos($path, '/uploads/') === 0) {
    $sub = str_replace('..', '', substr($path, strlen('/uploads/')));
    if ($sub === '') {
        http_response_code(404);
        exit;
    }
    $filePath = $UPLOADS_DIR . '/' . $sub;
    $realUploads = realpath($UPLOADS_DIR);
    if ($realUploads === false || !is_file($filePath) || realpath($filePath) === false || strpos(realpath($filePath), $realUploads) !== 0) {
        http_response_code(404);
        exit;
    }
    $mime = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif', 'webp' => 'image/webp',
    ][strtolower(pathinfo($filePath, PATHINFO_EXTENSION))] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    readfile($filePath);
    exit;
}

// --- Služba /videos/* (s Range pro mobil)
if (strpos($path, '/videos/') === 0) {
    $sub = str_replace('..', '', substr($path, strlen('/videos/')));
    $sub = rawurldecode($sub);
    if ($sub === '') {
        http_response_code(403);
        exit;
    }
    $filePath = $VIDEOS_DIR . '/' . $sub;
    $realVideos = realpath($VIDEOS_DIR);
    if ($realVideos === false || !is_file($filePath) || realpath($filePath) === false || strpos(realpath($filePath), $realVideos) !== 0) {
        http_response_code(404);
        exit;
    }
    $size = filesize($filePath);
    $contentType = 'video/mp4';
    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if (preg_match('/^bytes=(\d*)-(\d*)$/', $range, $m)) {
        $start = $m[1] === '' ? 0 : (int)$m[1];
        $end = $m[2] === '' ? $size - 1 : (int)$m[2];
        $len = $end - $start + 1;
        http_response_code(206);
        header('Content-Type: ' . $contentType);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
        header('Accept-Ranges: bytes');
        header('Content-Length: ' . $len);
        $fp = fopen($filePath, 'rb');
        fseek($fp, $start);
        $buf = 8192;
        while ($len > 0 && !feof($fp)) {
            $read = min($buf, $len);
            echo fread($fp, $read);
            $len -= $read;
        }
        fclose($fp);
        exit;
    }
    header('Accept-Ranges: bytes');
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . $size);
    readfile($filePath);
    exit;
}

// --- Statika z dist/ (stránky a assety)
$distPages = [
    '/' => 'index.html',
    '/index.html' => 'index.html',
    '/blog' => 'blog.html',
    '/blog.html' => 'blog.html',
    '/admin' => 'admin.html',
    '/admin.html' => 'admin.html',
    '/podpor' => 'podpor.html',
    '/podpor.html' => 'podpor.html',
];

// Přesměrování .html URL na hezké URL (bez .html)
$redirectMap = [
    '/index.html' => '/',
    '/blog.html' => '/blog',
    '/admin.html' => '/admin',
    '/podpor.html' => '/podpor',
];
if (isset($redirectMap[$path])) {
    header('Location: ' . $redirectMap[$path], true, 301);
    exit;
}
$distFile = null;
if (isset($distPages[$path])) {
    $distFile = $DIST_DIR . '/' . $distPages[$path];
} else {
    $localPath = ltrim(str_replace('..', '', $pathNorm), '/');
    if ($localPath === '') {
        $localPath = 'index.html';
    }
    $distFile = $DIST_DIR . '/' . $localPath;
}
$realDist = realpath($DIST_DIR);
if ($realDist !== false && $distFile !== null && is_file($distFile)) {
    $realFile = realpath($distFile);
    if ($realFile !== false && strpos($realFile, $realDist) === 0) {
        $ext = pathinfo($distFile, PATHINFO_EXTENSION);
        $mime = [
            'html' => 'text/html; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'json' => 'application/json',
            'ico' => 'image/x-icon',
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'mp4' => 'video/mp4', 'woff2' => 'font/woff2', 'woff' => 'font/woff',
        ][$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $mime);
        readfile($distFile);
        exit;
    }
}

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '404 Not Found';
