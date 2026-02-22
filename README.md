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

Backend je čistě PHP. Na serveru se předpokládá **Apache s PHP jako modulem (mod_php)**; alternativně nginx + PHP-FPM.

1. Na server zkopírujte celý projekt (nebo použijte větev `release` – viz níže).
2. Nastavte document root na složku projektu (kde leží `index.php`).
3. Zajistěte, že všechny požadavky jdou na `index.php` (Apache: `mod_rewrite` + `.htaccess`; nginx: viz příklad níže).
4. Vytvořte `.env` z `.env.example` a doplňte hesla.
5. Složky `uploads/` a `storage/` musí být zapisovatelné pro PHP (např. `chmod 755`, vlastník www-data).

**Apache – PHP jako modul (mod_php):**

Projekt má obsluhovat **PHP jako modul Apache** (mod_php), ne CGI ani PHP-FPM. Požadavky na `.php` pak Apache předá přímo modulu.

1. **DocumentRoot** musí ukazovat na **kořen klonu repa** (tam, kde po `git pull origin release` leží `index.php` a `.htaccess`), ne na podsložku `dist/` ani `public/`.
2. **AllowOverride** pro ten adresář musí být **All**, jinak se `.htaccess` nečte a rewrite na `index.php` nefunguje – Apache pak servíruje jen soubory a `/api/*` končí 404.
3. **PHP jako modul:** nainstalujte balíček pro váš PHP (např. `libapache2-mod-php8.2`), zapněte modul a restartujte Apache. Pak Apache sám obsluhuje soubory `.php` přes mod_php.

```bash
# Debian/Ubuntu – PHP jako modul Apache
sudo apt install libapache2-mod-php8.2   # nebo php8.1, php8.3 dle verze
sudo a2enmod rewrite php8.2
sudo systemctl reload apache2
```

Příklad vhostu (Debian/Ubuntu, úpravu cesty přizpůsobte):

```apache
<VirtualHost *:80>
    ServerName vas-domena.cz
    DocumentRoot /var/www/elephants

    <Directory /var/www/elephants>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php
    </Directory>
</VirtualHost>
```

S mod_php není ve vhostu potřeba nic dalšího – Apache předá `.php` soubory modulu automaticky. Ověření: na serveru `curl -I https://vas-domena.cz/api/posts` by měl vracet `Content-Type: application/json`, ne 404.

**Apache + PHP-FPM** (místo mod_php):

Pokud chcete, aby PHP obsluhoval **PHP-FPM** a Apache jen proxy předával požadavky na FPM:

1. Nainstalujte PHP-FPM (např. `php8.2-fpm`), ujistěte se, že FPM poslouchá na socketu (výchozí např. `/run/php/php8.2-fpm.sock`).
2. V Apache zapněte `proxy_fcgi` a `rewrite`: `sudo a2enmod proxy_fcgi rewrite`.
3. Ve vhostu nastavte `SetHandler` pro `.php` na proxy do FPM (cestu k socketu přizpůsobte verzi PHP):

```apache
<VirtualHost *:80>
    ServerName vas-domena.cz
    DocumentRoot /var/www/elephants

    <Directory /var/www/elephants>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php
    </Directory>

    # PHP předat PHP-FPM (socket – cesta dle verze: php8.1-fpm.sock, php8.2-fpm.sock, …)
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.2-fpm.sock|fcgi://localhost"
    </FilesMatch>
</VirtualHost>
```

Po změně: `sudo systemctl reload apache2`. Ověření stejné: `curl -I https://vas-domena.cz/api/posts` → `Content-Type: application/json`.

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

Stáhne `main`, vybuildí frontend a nahraje do větve `release` (včetně `index.php`, `.htaccess`, `php/`, `dist/`). Na produkčním serveru pak stačí `git pull origin release`. Pokud Apache po pullu nepoužívá PHP (API nefunguje, 404), zkontrolujte podle sekce „Apache – aby release větev opravdu používala PHP“ výše.

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
