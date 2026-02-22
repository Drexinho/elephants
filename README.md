# Kroměříž Elephants – web klubu amerického fotbalu

Multi-page marketingový web: úvodní stránka, blog a admin panel pro správu článků. Backend je **PHP** (napojení na MariaDB beze změny), frontend se buildí přes Vite + Tailwind.

## Technologie

- **PHP 7.4+** (PDO MySQL) – API a servírování statiky
- **Vite** ^6 – build nástroj pro frontend
- **Tailwind CSS** ^3.4 – styly
- **MariaDB** – články blogu (stejné schéma a .env jako dříve)

## Vývoj

1. **Backend (API, uploads, videos):** v jednom terminálu spusťte PHP vestavěný server:
   ```bash
   php -S 127.0.0.1:8080
   ```
2. **Frontend:** v druhém terminálu:
   ```bash
   npm install
   npm run dev
   ```
   Otevřete [http://localhost:5175](http://localhost:5175). Vite proxy přeposílá `/api`, `/uploads` a `/videos` na PHP na portu 8080.

Pro samotný build bez API stačí `npm run dev` (články se nenačtou bez běžícího PHP).

## Produkční build

```bash
npm run build
```

Výstup je ve složce `dist/`. PHP vstupní bod `index.php` servíruje obsah z `dist/`, API a složky `uploads/`, `public/videos/`.

## Databáze (MariaDB)

Blog ukládá články do **MariaDB**. Výchozí připojení: host `10.50.0.5`, databáze a uživatel `elephants`.

1. Na MariaDB vytvořte databázi a uživatele (jako root):
   ```sql
   CREATE DATABASE IF NOT EXISTS elephants CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'elephants'@'%' IDENTIFIED BY 'vaše_heslo';
   GRANT ALL PRIVILEGES ON elephants.* TO 'elephants'@'%';
   FLUSH PRIVILEGES;
   ```
2. Zkopírujte `.env.example` na `.env` a doplňte `DB_PASSWORD=vaše_heslo`.
3. Při prvním volání API článků se automaticky vytvoří tabulka `posts` (pokud neexistuje).

Proměnné prostředí (volitelné): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Soubor `.env` načítá `php/env.php` v kořeni projektu.

**Admin přihlášení:** Heslo do administrace je v `.env`: `ADMIN_USER` a `ADMIN_PASSWORD`. Přihlášení probíhá přes API (`/api/login`), PHP ověří údaje a nastaví session cookie (`elephants_session`).

**Ochrana proti brute-force:** Po několika neúspěšných pokusech z jedné IP se IP dočasně zablokuje (výchozí 5 pokusů, pak 15 minut). Konfigurace v `.env`: `LOGIN_MAX_ATTEMPTS`, `LOGIN_BLOCK_MINUTES`. Údaje se ukládají do `storage/login_attempts.json` (složka `storage/` je v `.gitignore`).

## Nasazení na server (produkce)

Backend je čistě PHP – vhodné pro Apache nebo nginx + PHP-FPM.

1. Na server zkopírujte celý projekt (nebo použijte větev `release` – viz níže).
2. Nastavte document root na složku projektu (kde leží `index.php`).
3. Zajistěte, že všechny požadavky jdou na `index.php` (Apache: `mod_rewrite` + `.htaccess`; nginx: viz příklad níže).
4. Vytvořte `.env` z `.env.example` a doplňte hesla.
5. Složky `uploads/` a `storage/` musí být zapisovatelné pro PHP (např. `chmod 755`, vlastník www-data).

**Apache:** V kořeni projektu je `.htaccess` – směruje vše na `index.php`. Potřebujete `AllowOverride All` a `mod_rewrite`.

**Nginx** – příklad location:

```nginx
root /var/www/elephants;
index index.php;
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
location ~ \.php$ {
    fastcgi_pass unix:/run/php/php-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

Statické soubory (JS, CSS, obrázky z `dist/`), `/uploads/` a `/videos/` obsluhuje `index.php`; pokud chcete, aby nginx servíroval přímo soubory z `dist/`, `uploads/` a `public/videos/`, lze přidat další `location` bloky a do `index.php` posílat jen to, co neodpovídá existujícímu souboru.

## Release větev

```bash
npm run release
```

Stáhne `main`, vybuildí frontend a nahraje do větve `release` (včetně `index.php`, `.htaccess`, `php/`, `dist/`). Na produkčním serveru pak stačí `git pull origin release`.

## Struktura projektu

```
├── index.php         # Vstupní bod – API + statika z dist/
├── .htaccess         # Apache rewrite na index.php
├── php/
│   ├── env.php       # Načtení .env
│   ├── db.php        # MariaDB – tabulka posts (stejné schéma)
│   ├── auth.php      # Session cookie, přihlášení
│   └── login-limiter.php
├── index.html        # Šablony (Vite je buildí do dist/)
├── blog.html
├── admin.html
├── package.json      # Pouze devDependencies (Vite, Tailwind)
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.js
│   ├── style.css
│   ├── config.js     # Kontaktní údaje
│   └── data/posts.js
└── public/
    ├── images/
    └── videos/       # Úvodní video
```

## Úpravy pro klienta

- **Barvy a fonty**: `tailwind.config.js` (theme.extend.colors, fontFamily).
- **Kontakty**: `src/config.js` – e-mail, telefon, adresa, Instagram.
- **Obrázky**: `public/images/OBRAZKY-README.txt`.

Loader se zobrazí na všech stránkách a skryje se po načtení. Kontaktní formulář používá mailto s e-mailem z `config.js`.
