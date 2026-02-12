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

Otevřete [http://localhost:5175](http://localhost:5175). Stránky: `index.html`, `blog.html`, `admin.html`. Články blogu se načítají a ukládají do souboru `data/posts.json` na serveru.

## Produkční build

```bash
npm run build
```

Výstup je ve složce `dist/`.

## Náhled buildu

```bash
npm run preview
```

## Nasazení na server (produkce)

Články blogu se ukládají do souboru **`data/posts.json`** na serveru. Pro produkci je potřeba běžet s Node serverem, který tento soubor čte a zapisuje:

```bash
npm run build
npm start
```

Server poběží na portu **5175** (nebo `PORT=8080 npm start`). Slouží statické soubory z `dist/` a API `GET/POST /api/posts` pro články. Složka `data/` musí existovat a soubor `data/posts.json` musí být zapisovatelný.

## Struktura projektu

```
Kroměříž Elephants/
├── index.html      # Domů – hero, o klubu, náhled blogu, kontakt
├── blog.html       # Seznam článků a zobrazení jednoho článku (#slug)
├── admin.html      # Admin – přidat / upravit / smazat příspěvky (ukládá do data/posts.json)
├── server.js       # Produkční server pro nasazení (slouží dist/ + API článků)
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
- **blog.html**: Příspěvky ze serveru (soubor `data/posts.json`), zobrazení jednoho článku podle hash.
- **admin.html**: Přihlášení, CRUD příspěvků. Ukládání na server do `data/posts.json`; při vývoji přes Vite, na produkci přes `node server.js`.

Loader se zobrazí na všech stránkách a skryje se po načtení (min. cca 600 ms). Kontaktní formulář používá mailto s e-mailem z `config.js`.
