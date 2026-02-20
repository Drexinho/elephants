# Kroměříž Elephants – web klubu amerického fotbalu

Multi-page marketingový web: úvodní stránka, blog a admin panel pro správu článků. Struktura podle referenčního návodu (Vite, Tailwind, čistý HTML/CSS/JS).

## Technologie

- **Vite** ^6 – build nástroj
- **Tailwind CSS** ^3.4 – styly
- Čistý HTML/CSS/JS (bez frontend frameworku)

## Vývoj

```bash
npm install
npm run dev
```

Otevřete [http://localhost:5175](http://localhost:5175). Stránky: `index.html`, `blog.html`, `admin.html`. Články blogu se načítají z **MariaDB** (při nevyplněném připojení fallback na `data/posts.json`).

## Produkční build

```bash
npm run build
```

Výstup je ve složce `dist/`.

## Náhled buildu

```bash
npm run preview
```

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
3. Při startu serveru se automaticky vytvoří tabulka `posts` (pokud neexistuje).

Proměnné prostředí (volitelné): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Bez nastaveného `DB_PASSWORD` při vývoji (Vite) se použije fallback na soubor `data/posts.json`.

**Produkce:** Heslo nikdy necommitujte. Na produkčním serveru vytvořte `.env` přímo tam (nebo nastavte env v systemd/Dockeru). Soubor `.env` je v `.gitignore` a nesmí být součástí deploye z repozitáře.

**Admin přihlášení:** Heslo do administrace (psaní článků) je **jen na serveru** v `.env`: `ADMIN_USER` a `ADMIN_PASSWORD`. Do buildu ani do kódu se nedostane – přihlášení probíhá přes API (`/api/login`), server ověří údaje a nastaví session cookie.

**Ochrana proti brute-force:** Po několika neúspěšných pokusech o přihlášení z jedné IP se tato IP dočasně zablokuje (výchozí 5 pokusů, pak 15 minut). Konfigurace v `.env`: `LOGIN_MAX_ATTEMPTS`, `LOGIN_BLOCK_MINUTES`. IP se bere z `X-Forwarded-For` / `X-Real-IP` při proxy.

## Nasazení na server (produkce)

```bash
npm run build
DB_PASSWORD=vaše_heslo node server.js
```

Nebo s portem: `PORT=8080 DB_PASSWORD=... node server.js`. Pro načtení z `.env` lze použít např. `dotenv` nebo export v shellu.

Server slouží statické soubory z `dist/`, API `GET/POST /api/posts` a `POST /api/upload` pro nahrání obrázků k článkům. Nahrané obrázky se ukládají do složky **`uploads/`** (vytvoří se automaticky) a servírují se na cestě `/uploads/`. Složku `uploads/` nemazat při deployi – obsahuje obrázky z adminu.

## Struktura projektu

```
Kroměříž Elephants/
├── index.html      # Domů – hero, o klubu, náhled blogu, kontakt
├── blog.html       # Seznam článků a zobrazení jednoho článku (#slug)
├── admin.html      # Admin – přidat / upravit / smazat příspěvky (ukládá do MariaDB)
├── server.js       # Produkční server (dist/ + API článků z MariaDB)
├── db.js           # Připojení k MariaDB a operace s tabulkou posts
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── src/
│   ├── main.js     # initPageLoader, initMobileMenu, applyContactConfig, kontaktní formulář
│   ├── style.css   # Tailwind + vlastní třídy (loader, hero, karty)
│   ├── config.js   # Kontaktní údaje – jediné místo pro e-mail, telefon, adresu, Instagram
│   ├── menu.js
│   ├── contact.js
│   └── data/
│       └── posts.js
└── public/
    └── images/     # logo.jpg, hero.jpg (viz OBRAZKY-README.txt)
```

## Úpravy pro klienta

- **Barvy a fonty**: Doplňte podle značky v `tailwind.config.js` (theme.extend.colors, theme.extend.fontFamily). Výchozí sémantické názvy: primary, accent.
- **Kontakty**: Upravte `src/config.js` – e-mail, telefon, adresa, URL Instagramu. Odkazy Zavolat, e-mail a sociální sítě se z configu aplikují na celý web.
- **Texty, ceny, adresy**: Doplňte přímo v HTML nebo v configu dle potřeby.
- **Obrázky**: Seznam přesných názvů a umístění je v `public/images/OBRAZKY-README.txt`. Formát a rozlišení viz tam.

## Obsah stránek

- **index.html**: Hero s animací, statistiky, O klubu, náhled blogu, kontaktní formulář (mailto).
- **blog.html**: Příspěvky z API (MariaDB), zobrazení jednoho článku podle hash.
- **admin.html**: Přihlášení, CRUD příspěvků. Ukládání do MariaDB; při vývoji přes Vite (s DB nebo fallback na `data/posts.json`), na produkci přes `node server.js`.

Loader se zobrazí na všech stránkách a skryje se po načtení (min. cca 600 ms). Kontaktní formulář používá mailto s e-mailem z `config.js`.
