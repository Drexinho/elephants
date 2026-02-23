<?php
/**
 * Ochrana proti brute-force na /api/login – stejná logika jako Node.
 * Konfigurace: LOGIN_MAX_ATTEMPTS (5), LOGIN_BLOCK_MINUTES (15).
 * Údaje se ukládají do souboru (PHP nemá sdílenou paměť mezi requesty).
 */

$LOGIN_LIMITER_FILE = null;

function login_limiter_file(): string {
    global $LOGIN_LIMITER_FILE;
    if ($LOGIN_LIMITER_FILE === null) {
        $dir = dirname(__DIR__) . '/storage';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $LOGIN_LIMITER_FILE = $dir . '/login_attempts.json';
    }
    return $LOGIN_LIMITER_FILE;
}

function login_limiter_get_client_ip(): ?string {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $first = trim($parts[0]);
        if ($first !== '') {
            return $first;
        }
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return trim($_SERVER['HTTP_X_REAL_IP']);
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

function login_limiter_load(): array {
    $path = login_limiter_file();
    if (!is_file($path)) {
        return [];
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function login_limiter_save(array $data): void {
    $path = login_limiter_file();
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    file_put_contents($path, json_encode($data), LOCK_EX);
}

function login_limiter_get_block_status(?string $ip): array {
    if ($ip === null || trim($ip) === '') {
        return ['blocked' => false];
    }
    $key = trim($ip);
    $data = login_limiter_load();
    $entry = $data[$key] ?? null;
    if ($entry === null) {
        return ['blocked' => false];
    }
    $now = (int)(microtime(true) * 1000);
    $blockedUntil = (int)($entry['blockedUntil'] ?? 0);
    if ($blockedUntil > 0 && $now < $blockedUntil) {
        return [
            'blocked' => true,
            'retryAfterSec' => (int)ceil(($blockedUntil - $now) / 1000),
        ];
    }
    if ($blockedUntil > 0 && $now >= $blockedUntil) {
        unset($data[$key]);
        login_limiter_save($data);
        return ['blocked' => false];
    }
    return ['blocked' => false];
}

function login_limiter_record_failed(?string $ip): void {
    if ($ip === null || trim($ip) === '') {
        return;
    }
    $key = trim($ip);
    $maxAttempts = (int)(getenv('LOGIN_MAX_ATTEMPTS') ?: 5);
    $blockMs = (int)(getenv('LOGIN_BLOCK_MINUTES') ?: 15) * 60 * 1000;
    $data = login_limiter_load();
    $entry = $data[$key] ?? ['count' => 0, 'blockedUntil' => null];
    $now = (int)(microtime(true) * 1000);
    if ($entry['blockedUntil'] && $now < $entry['blockedUntil']) {
        return;
    }
    $entry['count'] = (int)($entry['count'] ?? 0) + 1;
    if ($entry['count'] >= $maxAttempts) {
        $entry['blockedUntil'] = $now + $blockMs;
    }
    $data[$key] = $entry;
    login_limiter_save($data);
}

function login_limiter_record_success(?string $ip): void {
    if ($ip === null || trim($ip) === '') {
        return;
    }
    $key = trim($ip);
    $data = login_limiter_load();
    unset($data[$key]);
    login_limiter_save($data);
}
