<?php
/**
 * Načte .env ze složky nad php/ (kořen projektu).
 * Volitelné – na serveru lze nastavit proměnné v Apache/php-fpm.
 */
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile) && is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (preg_match('/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/', $line, $m)) {
            $key = $m[1];
            $value = trim($m[2], " \t\"'");
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}
