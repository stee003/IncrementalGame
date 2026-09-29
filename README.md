# Astral Foundry — Cosmic Crucible

Un gioco **incrementale / idle** per browser, scritto in JavaScript puro (ES Modules), senza framework e senza fase di build.
Comandi un'antica fonderia astrale sospesa tra le nubi: raccogli **Aether**, costruisci strutture, trascrivi codici dimenticati e ascendi.

---

## ▶️ Come si gioca (avvio)

> **Importante:** **non basta aprire `index.html` con doppio clic.**
> Il gioco usa moduli ES (`<script type="module" src="js/main.js">`): con il protocollo `file://` il browser blocca
> gli `import` per policy CORS e vedresti solo una pagina vuota con errori in console.
> Serve quindi un **server HTTP locale** (nessuna build, nessuna dipendenza di runtime).

### Opzione 1 — npm (consigliata)

```bash
npm start
# poi apri http://localhost:3000
```

`npm start` esegue `python3 -m http.server 3000 --bind 0.0.0.0` (richiede Python 3 installato).

### Opzione 2 — Python, a mano

```bash
python3 -m http.server 3000        # oppure: python -m http.server 3000
# apri http://localhost:3000
```

### Opzione 3 — Node (senza Python)

```bash
npx serve -l 3000 .
# oppure
npx http-server -p 3000 -a 0.0.0.0 .
```

### Opzione 4 — VS Code

Installa l'estensione **Live Server**, clicca con il tasto destro su `index.html` → *Open with Live Server*.

Per fermare il server: `Ctrl+C` nel terminale.

---

## 🎮 Comandi

| Azione | Come |
|---|---|
| Raccogliere Aether | Click sul cristallo centrale ("Channel Core") oppure tasto <kbd>Spazio</kbd> |
| Muto / audio | Tasto <kbd>M</kbd> oppure l'icona 🔊 in alto a destra |
| Salvataggio manuale | <kbd>Ctrl</kbd>+<kbd>S</kbd> (o <kbd>Cmd</kbd>+<kbd>S</kbd> su macOS) oppure l'icona 💾 |
| Impostazioni | Icona ⚙️ in alto a destra |
| Acquisto multiplo | Pulsanti **1x / 10x / 25x / Max** nel pannello Buildings |

## 🗂️ Le schede di gioco

- **Overview** – stato della fonderia e direttive di base.
- **Production** – produzione corrente, moltiplicatori e breakdown delle risorse.
- **Buildings** – 6 strutture (Aether Condenser, Resonance Furnace, Void Garden, Astral Observatory, Chronal Engine, Celestial Forge).
- **Upgrades** – miglioramenti una tantum per click, edifici e produzione.
- **Research** – 4 rami di ricerca (Aether Engineering, Astral Biology, Temporal Mechanics, Void Studies).
- **Automation** – droni e matrici che comprano/cliccano al posto tuo.
- **Archive** – milestone e obiettivi raggiunti.
- **Ascension** – prestige: azzera i progressi in cambio di perk permanenti.

## 💾 Salvataggi

- Il salvataggio è automatico ogni **30 secondi**, alla chiusura della scheda e con `Ctrl+S`.
- I dati vivono nel **`localStorage`** del browser (chiave `ASTRAL_FOUNDRY_SAVE_V1`): sono legati a browser + origine
  (`http://localhost:3000`). Se apri il gioco su una porta o un host diversi, riparti da zero.
- Da **⚙️ Impostazioni → Save Management** puoi **esportare** il salvataggio come stringa (backup / altro browser),
  **importarlo**, o fare un **hard reset** ("Extinguish Foundry").
- **Progresso offline:** al ritorno la fonderia produce al **50%** del ritmo, fino a un massimo di **12 ore**.

## 🧪 Test

```bash
npm install     # installa solo jsdom (devDependency, serve per i test DOM)
npm test        # esegue tests/test-game-logic.js e tests/test-dom-ui.js
```

I test girano con Node (>= 18) in modalità ES Modules; il gioco in sé non ha dipendenze di runtime.

## 📁 Struttura del progetto

```
index.html              Markup statico: header, schede, modali
styles/                 CSS (main, layout, foundry, components, animations)
js/
  main.js               Entry point: game loop, delta-time, scorciatoie da tastiera
  config.js             Tutti i dati di gioco bilanciati (edifici, upgrade, research, milestone, perk)
  state.js              Stato centrale del gioco (single source of truth)
  systems/              Logica: production, resource, buildings, upgrades, research,
                        automation, milestones, prestige, offline, save
  ui/                   ui-manager.js (rendering), notifications.js, floating-text.js
  visuals/              foundry-canvas.js (particelle/canvas) e foundry-model.js (fonderia che si evolve)
  utils/                formatters.js, math.js, audio.js
tests/                  Suite di test (logica + DOM con jsdom)
```

## 🎨 Grafica e rendering

La scena è composta da due strati che cooperano.

**`js/visuals/foundry-canvas.js` — lo sfondo cosmico (canvas 2D)**

- **Cielo a 3 profondità**: circa 300 stelle su tre livelli, ognuno con velocità, dimensione e parallasse proprie; le stelle più luminose hanno un riflesso a croce.
- **Nebulose additive**: 7 nubi che derivano, respirano e seguono il puntatore, con tinta dorata durante le **Surge**.
- **Correnti di Aether**: filamenti di energia che salgono dal basso con flusso animato.
- **Mote convergenti**: pulviscolo di Aether che fluttua e viene risucchiato dal nucleo centrale quando si avvicina.
- **Sparks e onde d'urto**: esplosioni luminose al click, con scia di motion-blur e anelli che si espandono; il nucleo emette spontaneamente scintille quando la produzione è alta.
- **Stelle cadenti** occasionali, e un bagliore centrale che pulsa più forte all'aumentare della produzione.

**`js/visuals/foundry-model.js` + `styles/foundry.css` — la struttura**

Dieci livelli sovrapposti (isola, dais, anelli astrolabio, ginnasio cronale, forcella da officina, alone, ecc.) che si attivano con i progressi. Ogni strato ha una profondità di parallasse propria e l'intera struttura inclina in 3D seguendo il puntatore.

**Dettagli di implementatione**

- Tutti i movimenti sono **delta-time based**: la velocità non dipende dal frame rate.
- Il **glow** usa sprite pre-renderizzati e composizione `lighter` invece di `shadowBlur` (molto più costoso).
- **Qualità adattiva**: se i frame rallentano in modo sostenuto, gli effetti più costosi (correnti, stelle cadenti, riflessi) vengono spenti e ripristinati quando c'è margine. Le soglie derivano dal miglior frame osservato, quindi funzionano sia a 60Hz che ad alti refresh.
- **Responsivo**: il canvas si riadatta con `ResizeObserver` e le entità vengono riposizionate dentro i nuovi bordi.
- **Accessibilità**: `prefers-reduced-motion` disattiva le animazioni; l'opzione *Particles* in Impostazioni disattiva moti, sparks e correnti mantenendo lo sfondo.
- Il renderer ha un **percorso lite** per contesti 2D limitati (è quello che usa il mock di canvas dei test con jsdom).

## 🔧 Requisiti

- Un browser moderno (Chrome, Firefox, Edge, Safari).
- Un server statico qualsiasi: Python 3, Node.js o l'estensione Live Server di VS Code.
- Nessuna build, nessun bundler, nessuna dipendenza npm per giocare.
