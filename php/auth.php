<?php
/**
 * Přihlášení do administrace – stejná logika jako Node (heslo z .env, session cookie).
 * Kompatibilní formát cookie, aby fungovaly existující session.
 */

require_once __DIR__ . '/env.php';

define('AUTH_ADMIN_USER', getenv('ADMIN_USER') ?: 'admin');
define('AUTH_ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: '');
define('AUTH_SESSION_COOKIE', 'elephants_session');
define('AUTH_SESSION_MAX_AGE', 60 * 60 * 24); // 24 h
define('AUTH_SECRET', AUTH_ADMIN_PASSWORD !== '' ? AUTH_ADMIN_PASSWORD : 'dev-secret');

function auth_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function auth_base64url_decode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/'), true);
}

function auth_sign_session(array $payload): string {
    $json = json_encode($payload);
    $b64 = auth_base64url_encode($json);
    $sig = auth_base64url_encode(hash_hmac('sha256', $b64, AUTH_SECRET, true));
    return $b64 . '.' . $sig;
}

function auth_verify_session(?string $cookieVal): ?string {
    if ($cookieVal === null || $cookieVal === '') {
        return null;
    }
    $dot = strpos($cookieVal, '.');
    if ($dot === false) {
        return null;
    }
    $b64 = substr($cookieVal, 0, $dot);
    $sig = substr($cookieVal, $dot + 1);
    $expected = auth_base64url_encode(hash_hmac('sha256', $b64, AUTH_SECRET, true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    try {
        $json = auth_base64url_decode($b64);
        $payload = json_decode($json, true);
        if (!is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && (int)$payload['exp'] < (time() * 1000)) {
            return null;
        }
        return isset($payload['user']) ? (string)$payload['user'] : null;
    } catch (Throwable $e) {
        return null;
    }
}

function auth_get_session_user(): ?string {
    $cookie = $_COOKIE[AUTH_SESSION_COOKIE] ?? '';
    if ($cookie !== '') {
        $cookie = rawurldecode($cookie);
    }
    return auth_verify_session($cookie);
}

function auth_create_payload(string $user): array {
    return [
        'user' => trim($user),
        'exp' => (int)((time() + AUTH_SESSION_MAX_AGE) * 1000),
    ];
}
