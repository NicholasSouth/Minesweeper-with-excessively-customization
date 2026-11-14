# Minesweeper (with excessive customization) v5.1

A browser Minesweeper with a lot of knobs: custom boards, a movable and resizable board, zoom, themes, fonts, sounds, cursors, backgrounds, rebindable keys, and a replay of every finished game, hints, a quick guide, and three file types to save and share replays, settings and board seeds.

**Play it:** https://nicholassouth.github.io/Minesweeper-with-excessively-customization/

No install, no build step, no account. Everything runs in your browser.

---

## What's new in v5.1

This version is about speed: big boards, phones and slow connections. The rules, the board layouts and the file formats are unchanged.
Also I give my sincere apology to version 5.0, eventhough is a big update but is done very poorly with a lot of wrong codes, this version is a total touch up to every aspect of the codes

- **Big no-guess boards no longer freeze the page.** The search for a guess-free layout on your first click used to run on the page itself, so on a phone a big or dense board could freeze it for seconds. Now it runs in a **Web Worker** (`scripts/deal-worker.js`), a background thread, and the page stays responsive.
  - Only boards that can be slow use it: **400 or more cells, or 17% or more mines**. Smaller boards are dealt instantly in the page, as before.
  - If the deal takes more than about 0.15 seconds, the info line shows *Dealing a no-guess board…*. Starting a new game while it is dealing simply cancels it.
  - If workers are not available (for example when you open `index.html` straight from disk), the game deals in the page like before.
  - The worker is started while the page is idle after loading, so the first click does not pay for starting it.
- **A board is only dealt once.** The layout depends only on the board size, mines, first-click mode, seed, no-guess setting and your first cell, so the game now keeps the last few layouts in memory. Every loop of the replay after the first one reuses the layout instead of solving it again (before, each loop re-ran the solver: about 1 second on a dense 16×30 board on a desktop, several times that on a phone). The boards and replays are exactly the same as before.
- **Faster repeat visits (service worker):** `sw.js` saves the game files (code, styles, images, fonts and sound effects) on your device the first time you visit. After that the game loads from the device, even on a slow or dropped connection. The two long music tracks are not saved; they still stream. This needs https or `localhost`, so it is skipped when you open the file from disk. When a new version is released, the old copy is replaced on your next reload.
- **Smoother scrolling on phones:** the scroll lock used to keep a listener on every touch and wheel movement at all times, which makes the browser wait for the page before it scrolls. It is now added only while the lock is on (`C`), so phones, which can't turn the lock on, never pay for it.
- **Replay automatically is off by default on touch screens.** The endless VHS replay loop is heavy for phones. The switch is still in the Replay section if you want it back; anything you already chose is kept.
- The page title and the credits popup now say 5.1 (they still said 4.0).

<details>
<summary>Previous version: v5.0</summary>

This version is about animation: smoother, cheaper to run, and customizable. The rules and the file formats are unchanged.

- **New board glow:** starting a new board sends a light once around the **whole game panel** (HUD, zoom bar and board), with a soft halo. It takes about 0.7 seconds. It replaces the old effect where every cell popped in one by one, which animated hundreds of cells at once.
- **New board wipe:** a swoosh sweeps **left to right** and reveals the new board behind it (about 0.55 seconds). A panel-coloured cover hides the board and slides away, and its trailing edge is the glowing streak.
- **Both are customizable:**
  - **Settings > Effects** has two new switches: *Glow around the game panel on a new board* and *Swoosh wipe that reveals a new board*. Both are on by default and independent of each other.
  - **Settings > Theme > Colors** has two new colours, **Glow tail** and **Glow head**. They colour both the glow and the swoosh, are kept per theme, and each theme has its own default pair (for example violet to pink on Lust). *Reset colors* and *Reset all appearance* bring them back.
- **Lighter cell reveal:** the reveal pop no longer animates a brightness filter. A filter per cell made the browser create a layer for every cell on a big flood fill. It is now scale and fade only.
- **Lighter VHS replay:** same look (scanlines, vignette, tracking bar, grain, colour fringing, jitter, PLAY label), cheaper to draw.
  - The tracking bar moves with `transform` instead of `top`, and no longer uses `backdrop-filter: blur`.
  - The grain no longer uses `mix-blend-mode`. Its colour comes from `--vhs-grain` and the noise image only supplies the alpha.
  - The board's blur and two drop-shadows are gone. The red/cyan fringe is now a text-shadow on the numbers plus a fringe on the screen edges. The colour grade (`saturate` and `contrast`) stays.
  - New: a thin **tear line** that hops down the picture now and then.
- **Explosion:** looks the same as in v4.0 (fireball, two shockwaves, sparks, shake, red flash, popping mines), but is cheaper to run:
  - the shockwave rings are scaled instead of animating `border-width`, and the red halo on the mine you hit is drawn once and only faded,
  - the mine pops stay on the compositor, and their layers are released as soon as each pop ends (before, about 100 stayed alive until the next game),
  - popping mines no longer run a colour transition at the same time,
  - the explosion starts before the sound is played, and saving the replay to browser storage is delayed by a moment, so neither lands in the first frame of the explosion.
- **No hardcoded colours in the stylesheets:** every colour now comes from a variable defined in `styles/themes.css`. New variables: `--glow1`, `--glow2` (per theme), `--mask`, `--vhs-bar-core` and `--vhs-grain` (shared). `color-mix` is now only used to fade a colour to transparent; the places that used it to make a new colour were changed:
  - rock-splash droplets use `--n1`,
  - a highlighted settings section uses `--rev` with the accent border,
  - the hover colour of hidden cells and the muted text colour, when you pick custom colours, are now plain hex values worked out in `theme-colors.js` (`mixHex`),
  - the explosion's yellow spark uses `--fx-fire`.
- The new effects only animate `transform` and `opacity`, and are skipped when your system's reduce-motion setting is on.

</details>

<details>
<summary>Earlier version: v4.0</summary>

- **Hints (`H`):** press `H` (or the **Hint** button) and the game marks a move that logic can prove from what is on the board. A **green glow** is a safe cell, a **red glow** is a mine, and **dashed rings** show the numbers the hint is built from. A hint never moves your keyboard cursor or the view. See [Hints](#hints).
- **Quick guide (`G` or `?`):** a popup with the goal, the controls (it shows your own key bindings), hints and files. Open it with `G` or the **?** button in the top right corner of the board setup panel; close it with `G`, `Esc`, **Close** or a click outside.
- **Three file types**, all plain JSON:
  - **`.mire`: replays.** Replays now use `.mire` (it replaces `.misw`). **Old `.misw` replays can no longer be opened**, and a replay saved in your browser by v3 is dropped on first load.
  - **`.mise`: settings.** Export and import your settings from the top of the settings bar.
  - **`.mifi`: board seed.** Export the board you are playing and share it: anyone who loads the file gets exactly the same board. See [File formats](#file-formats).
- Replays now also record how many hints were used.
- **Stylesheet split:** `styles/main.css` is now 12 smaller files, one per area (see [Running it locally](#running-it-locally)). The page looks exactly the same.
- New keys in Settings > Keys: **Show a hint** (`H`) and **Open / close quick guide** (`G`).

</details>

<details>
<summary>Earlier version: v3.2</summary>

- **One key for chord, one key for the board:** there is no separate chord key any more. **`D` / `Space` (Open cell) now also chords** when the cursor is on an opened number, the same as clicking it. **`C` is now "Jump to board, lock / unlock view"**: it brings the keyboard back to the board and locks scrolling in one press (it also closes the settings menu); press `C` again to unlock. The separate **Chord** and **Lock** actions are gone from Settings > Keys, and the lock badge shows whichever key you bound to Jump to board. A key you had saved for Jump to board is kept.
- **Steady HUD:** the mine counter, face and timer no longer shift as the numbers change or when you switch fonts. The face now sits in the exact centre, and the counter and timer have a fixed width.

</details>

<details>
<summary>Earlier version: v3.1</summary>

- **`S` opens and closes the settings menu** (it still closes with Esc and the close button). Closing with `S` hands the keyboard back to the board, so you can keep playing.
- **`M` mutes and unmutes** the sound, the same as the speaker button in the header.
- **Both keys are rebindable** in Settings > Keys, under View.
- **Scroll lock fix:** the page height is held while locked and any page scroll is put straight back.
- **New board resets the view:** starting a new game puts the keyboard cursor on the first cell and pans the board window back to the top-left.

</details>

<details>
<summary>Earlier version: v3.0</summary>

- **No-guess boards (new default):** mines are dealt, then checked by a built-in logic solver; if the board can't be cleared by logic alone, it is re-dealt until one can. Every number you need can be deduced, so no move is ever a coin flip. Choose **Classic (random)** under **Boards** in the setup panel for the old behaviour. See [No-guess mode](#no-guess-mode).
- **App icon:** the page now uses `assets/app-icon.ico` as its browser tab icon.
- **Replay files:** `.misw` files now record the board type (format v2). Older v1 files still load as classic boards.
- **Records kept apart:** best times are tracked separately for no-guess and classic boards.

</details>

<details>
<summary>Previous version: v2.0</summary>

- **Rebind every key:** the new **Keys** tab in Settings lets you change the keyboard controls. Each action has two slots, click a slot and press the key you want. Backspace clears a slot, Esc cancels, and **Reset keys** brings the defaults back. If a key is already used by another action, it is taken from that action and you are told which one.
- **Scroll lock (`L`):** locks the page and the settings bar so nothing scrolls except the board, which still pans and zooms. A small badge shows while it is on. Press `L` again to unlock.
- **Chord with `C`:** `C` chords on the board. Pressed from anywhere else, it jumps back to the board (to your last cell, or the first one), so you can use the keyboard without reaching for the mouse. Both actions can share a key and each is also rebindable.
- **Reset keys changed:** reset view is now `1` (it was `0`) and reset layout is `2`.
- **Styled scrollbars:** slim scrollbars in the theme colors, with a new **Scrollbars** section in Settings > Theme to change the thumb color, track color and thickness (4 to 16 px). Colors are kept per theme. The thumb lights up in the accent color on hover.
- **Restyled settings menu:** the sidebar has a new look, with tabs (Audio, Theme, Effects, Keys), grouped sections that glide in when you open the menu or switch tab, a close button, and a dimmed background on narrow screens.
- **No more hardcoded colors in the VHS replay:** the scanlines, vignette, tracking bar, PLAY label and its red/cyan fringe now come from CSS variables instead of fixed values in the rules, so the look is defined in one place and easy to tweak.
- **Code split into small scripts:** the old single `main.js` is now 22 smaller files in `scripts/`, each with one job (engine, board, input, replay, keys, audio, fonts and so on). See [Running it locally](#running-it-locally).
- Updated the on-page help text and the keyboard table to match the new keys.

</details>

<details>
<summary>Earlier version: v1.1</summary>

- **Replay section** under the board: watch your last game in a loop with a VHS look, change the speed, **export it as a `.misw` file** and **import** any `.misw` file to watch it.
- **Boards fit the screen:** Intermediate and Expert now pick a cell size that shows the whole board without scrollbars.
- **Font size sliders**, with a default size for each font, and a bigger app text by default.
- **New fonts:** Two Fifty Six Bytes (default), Times New Roman, Consolas, Segoe UI, Ithaca and Comic Sans MS. The fonts that ship with the site are free to use (see [Credits and licenses](#credits-and-licenses)).
- **New music:** two background tracks, **Classic** (default) and **Dreams**. You can still upload your own.
- **Credits** for all music and fonts, in this README and in the in-app credits popup (click the app name).
- Replaced the previous background music and the Twobit and Minecraft fonts with the music and fonts credited below.

</details>

---

## How to play

The keyboard keys below are the **defaults**. You can change all of them in **Settings > Keys**.

| Action | Mouse / touch | Default key |
|---|---|---|
| Open a cell (or chord, on an opened number) | Left-click or tap | `D` or `Space` |
| Flag a cell | Right-click or long-press | `F` |
| Chord (open all neighbours of a satisfied number) | Click the number | `D` or `Space` on the number |
| Move the keyboard cursor | | Arrow keys |
| Jump back to the board and lock / unlock scrolling | | `C` |
| Open / close settings | Gear button | `S` |
| Mute / unmute | Speaker button | `M` |
| Show a hint | **Hint** button | `H` |
| Quick guide | **?** button (top right of the setup panel) | `G` |
| New game | Face button or **New game** | `R` |
| Zoom in / out | `+` / `-` buttons, Ctrl + wheel, pinch | `+` or `=` / `-` or `_` |
| Reset zoom | **Reset view** | `1` |
| Reset board position and size | **Reset layout**, or double-click the grip bar | `2` (or `Home` on the grip bar) |
| Move the board | Drag the grip bar above it | Arrow keys on the grip bar |

Clicking a flagged cell removes the flag and opens the cell. **Flag mode** turns every tap into a flag, which is handy on touch screens. Keys work from anywhere on the page except while you are typing in a text box.

---

## Features

### Game setup
- **Presets:** Beginner (9x9, 10 mines), Intermediate (16x16, 40), Expert (16x30, 99).
- **Custom boards:** set rows, columns and mines directly, by percentage, or with the slider. **Edit as custom** copies the current preset into the custom fields.
- **Difficulty readout** with a warning when the mine density is above 35%, where most boards can't be solved without guessing.
- **First-click protection:** Safe zone (3x3), Safe cell, or No protection.
- **Boards:** **No guessing (solvable)** (default) or **Classic (random)**.
- **Best time** is remembered for each board setup, kept apart for no-guess and classic boards.
- **Face button** reacts to your clicks and to winning or losing.

### Hints
- **Logic only:** the hint uses just the opened numbers and the mine total, never the hidden mines, in rounds: first what the numbers say directly, then what that proves, and so on. You always get the shortest argument available, and a safe cell is preferred over a mine.
- **Your flags are never trusted.** A wrong flag cannot mislead a hint; if a flagged cell is provably safe, the hint says your flag is wrong.
- If nothing can be proven you are told that a guess is needed. In **No guessing** mode that does not happen unless you ran out of logic by a mistake.
- Asking for the same hint again is free. A game won **with hints does not set a best time**; the number of hints is saved in the replay.

### Board
- **Fits your screen:** the board picks the biggest cell size that shows the whole board without scrollbars, including Intermediate and Expert on laptop screens.
- **Mine counter and timer** in a HUD above the board.
- **Zoom** with buttons, Ctrl + wheel, trackpad or touch pinch, or the keyboard. Drag the board to pan.
- **Movable board:** drag the grip bar to place it anywhere.
- **Resizable board:** drag the corner handle.
- **Quick guide** with `G` or the **?** button.
- **Chording** (click a number, or `D` / `Space` on it) and **flag mode** for fast play.
- **Full keyboard play** with a visible keyboard cursor.
- **Scroll lock** (`C`) so the page stays still while you play with the keyboard. The page position and height are frozen while it is on, so nothing moves after a win or loss.

### No-guess mode
- After your first click, the game deals a layout and plays it with logic only (no guessing): a number whose mines are all found frees its other neighbours, a number whose hidden cells are all mines marks them, two overlapping numbers are compared (subset rule), and the total mine count is used at the end. If that clears the whole board, you get it. If not, the mines are re-dealt (up to 4000 tries) and checked again.
- The solver is sound: it never calls a board solvable when it needs a guess. It is not complete, so a few guess-free boards that need very advanced reasoning are skipped.
- Typical cost is a few milliseconds. Beginner and Intermediate almost always succeed on the first try or two, Expert needs about 20 tries with Safe zone, and more with Safe cell or No protection (still well under a second).
- **Very dense custom boards** (roughly 20% mines on big boards and up) may not have a guess-free layout within the limit. Then the game uses the layout that logic got furthest on and shows a message that this board may need a guess.
- It is deterministic: the same seed and first click always give the same board, so replays still match exactly.
- **Big or dense boards are dealt in a background worker** (400 or more cells, or 17% or more mines), so the page does not freeze while the solver works. On a very dense custom board the wait can still be a few seconds on a phone; the info line says *Dealing a no-guess board…* meanwhile.
- Dealt layouts are remembered (the last few), so a replay never solves the same board twice.

### Keys
- Every action has **two key slots**: move up/down/left/right, open cell (also chords), flag, show a hint, jump to board and lock / unlock view, open / close settings, open / close quick guide, mute, new game, zoom in, zoom out, reset view, reset layout.
- Actions are grouped as **Movement**, **Actions** and **View**.
- Click a slot and press a key to set it. **Backspace** clears the slot, **Esc** (or clicking away) cancels.
- Keys that would break the page (Tab, Esc, Enter, Backspace, Delete and modifier keys) can't be assigned. Ctrl, Cmd and Alt combinations are ignored so browser shortcuts keep working.
- Your bindings are saved in your browser. **Reset keys** restores the defaults.

### Replay
Every move you make (open, flag, chord) is recorded. The **Replay** section under the board is where you use it:
- **Watch replay / Stop replay:** plays the last finished game on the board in a loop with a VHS-style effect (scanlines, tracking bar, grain, colour fringing, tape tear, a blinking PLAY label). Stop replay (or New game) deals a fresh board.
- **Replay automatically when a game ends:** on by default (off by default on touch screens, where the looping effect is heavy); untick or tick it any time to change it.
- **Speed:** 0.5×, 1×, 2×, 4× or 8×.
- **Export .mire:** saves the replay as a small `.mire` file (plain JSON: board size, mines, first-click mode, board type, the random seed, hints used and the list of moves).
- **Import .mire:** loads a `.mire` file and plays it, even if it was made on another board size or by someone else. Files are checked first, so a broken or foreign file gives an error message instead of a broken board. Old `.misw` files from v3 are refused with a message.
- The last replay is kept in your browser, so it is still there after a reload.

### Settings menu
A slide-out bar on the right (open and close it with the gear button, `S` or Esc) with four tabs: **Audio**, **Theme**, **Effects** and **Keys**. Sections glide in as you open the bar or switch tab, and on narrow screens the page behind it is dimmed. The Jump-to-board key also closes it.

### Files
- **Replay `.mire`:** Replay section (see above).
- **Settings `.mise`:** the two buttons at the top of the settings bar save or load everything saved in your browser (setup, theme, colours, fonts and sizes, volumes, effects, key bindings, layout...). Uploaded sounds, fonts, images, cursors and backgrounds are **not** included, because they stay in your browser only. Loading asks first, then reloads the page. Settings this version does not know are ignored.
- **Board seed `.mifi`:** under the board setup. **Export board seed** is available once the first cell is open (the first click deals the board), and also while a replay plays. **Import board seed** sets up that board and opens the same first cell, so everyone starts from the same position.

### Themes and colours
- Four built-in themes: **Novel**, **Lust**, **Combust**, **Ethereal**. Switch with the dots in the header.
- **Edit any colour** of the current theme, including the **Glow tail** and **Glow head** colours of the new-board glow and swoosh. Each theme keeps its own colours, with a reset button.
- **Scrollbars:** edit the thumb and track colours (kept per theme) and the thickness (4 to 16 px), with its own reset button. Firefox only supports a thin and a normal width, so there sizes up to 8 px are thin.

### Fonts
- Choose the app font and the board/counter font separately from: **Two Fifty Six Bytes** (default), **Times New Roman**, **Consolas**, **Segoe UI**, **Ithaca**, **Comic Sans MS**. Two Fifty Six Bytes and Ithaca ship with the site; the other four use the font installed on your device (Windows and macOS usually have them).
- **Size sliders** for each, and each font has its own sensible default size.
- **Upload your own font** (`.ttf`, `.otf`, `.woff`, `.woff2`, up to 8 MB).

### Audio
- **Background music:** pick **Classic** by Joakim Karud (default) or **Dreams** by Dj Quads. The choice is remembered.
- Volume sliders for master, all sound effects, and each effect individually (reveal, chord, flag, interface click, explosion, win, lose), plus music and background video.
- **Replace any sound, including the music, with your own file** (mp3, wav or ogg, up to 8 MB). Reset brings the chosen track back.
- Quick **mute** button in the header.

### Cursors, icons and backgrounds
- **Custom cursors:** a set of images for normal, select, flag, holding and text/resize states, with adjustable size, hotspot and per-image scale.
- **Replace any icon** (faces, sound and settings buttons, flag icons) with your own image.
- **Board background** and **app background**: an image or a video (video up to 64 MB), with dimming and mute options.

### Animations
Each can be switched off in the Effects tab:
- Glow around the game panel on a new board
- Swoosh wipe that reveals a new board
- Rock splash when opening a cell
- Water ripple on buttons
- Flag drop and lift
- Win animation (confetti, frame pulse, happy face)
- Lose animation (explosion, shake, red flash, popping mines)

Everything also stays off when your system's **reduce motion** setting is on.

### Other
- **Responsive** layout that works on phones and tablets as well as desktops.
- **Fast repeat visits:** after your first visit the game is kept on your device (service worker, needs https or `localhost`), so it opens quickly even on a slow connection. Music still streams.
- **Everything is saved in your browser:** settings, colours, key bindings, fonts, uploads and best times stay on your device. Nothing is sent to a server, and other visitors never see your changes.
- **Reset all appearance** puts colours, fonts, icons and backgrounds back to the defaults.
- Click the app name in the header for the credits.

---

## Running it locally

It is plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder (for example `python -m http.server`) if your browser blocks local font or audio files.

```
index.html
sw.js         service worker: keeps the game on the device for fast repeat visits (change VERSION in it on every release)
styles/     one file per area, loaded by main.html in this order (later files override earlier ones):
              themes.css       shipped fonts, shared variables (every colour lives here), the four palettes
              base.css         base elements, controls, button ripple
              app.css          app background, app panel, header
              popups.css       credits and quick guide popups
              setup.css        game setup panel and the ? button
              board.css        frame, grip, HUD, zoom bar, board, cells, effects (glow, wipe, explosion), info line, hint marks
              replay.css       replay section and the VHS look
              sidebar.css      settings bar, tabs, groups, settings file buttons, scrim
              tabs.css         Audio, Theme, Effects and Keys tab contents
              cursor.css       custom page-drawn cursor
              scroll.css       scroll lock and scrollbars
              motion.css       reduced motion (keep last)
scripts/    one file per job, loaded by index.html in this order:
              engine.js        game rules (mines, reveal, chord, win/lose), the no-guess solver, the hint finder and the deal cache
              deal.js          first-click deal of big no-guess boards in a worker, with the fallback
              settings.js      saved settings and defaults
              audio.js         sound effects and music playback
              shell.js         shared helpers, app background video, header
              setup.js         game setup panel
              layout.js        movable / resizable board
              hud-zoom.js      mine counter, timer, zoom
              board.js         building and drawing the board
              replay.js        recording, VHS replay, .mire export / import
              keys.js          key bindings and the Keys tab
              hint.js          showing a hint (the logic is findHint in engine.js)
              board-input.js   scroll lock, mouse, touch and keyboard input
              effects.js       animations (explosion, glow, wipe, splash, confetti) and the Effects tab
              sidebar.js       the settings bar and its tabs
              audio-tab.js     Audio tab
              theme-colors.js  Theme tab: colours (including glow) and scrollbars
              fonts.js         fonts and font upload
              assets.js        replaceable icons and images
              cursor.js        custom cursors
              backgrounds.js   board and app backgrounds
              credits.js       credits popup
              guide.js         quick guide popup
              files.js         .mise settings and .mifi board seed export / import
              boot.js          restores saved uploads, starts the first game and registers sw.js
              deal-worker.js   (started by deal.js, not listed in index.html) runs the solver in a worker; it loads engine.js
fonts/      TwofiftysixbytesRegular-5yD0j.otf, Ithaca-LVB75.ttf
assets/     icons, cursors and images, app-icon.ico (browser tab icon)
audio/      sound effects, Joakim_Karud_-_Classic.mp3, Dj_Quads_-_Dreams.mp3
```

The service worker and the Web Worker need the game to be served over `http://localhost` or https (`python -m http.server` is enough). Opened straight from disk the game works the same, just without them.

**Releasing a new version:** change `VERSION` in `sw.js` (for example `v5.1.0` to `v5.1.1`) every time you upload a change, otherwise players who already visited keep the old saved files. While testing, tick *Update on reload* under Application > Service Workers in the browser's dev tools.

## Credits and licenses

The game itself (code and design) is the intellectual property of **Nguyen Thien Nhan, HCMUTE-24110114**. That does not cover the third-party music and fonts below, which keep their own licenses.

### Music

| Track | Artist | License | Source |
|---|---|---|---|
| Classic | Joakim Karud | Creative Commons Attribution (CC BY): free to use and adapt, including commercially, if credit is given | https://www.joakimkarud.com/use-my-music/ |
| Dreams | Dj Quads | No Copyright music, still, credit to them for this lovely song | |

### Fonts

| Font | Designer | License | Source |
|---|---|---|---|
| Two Fifty Six Bytes | Ray Larabie (Typodermic Fonts) | CC0 1.0, public domain, no credit required (credit given anyway) | https://www.typodermicfonts.com |
| Ithaca | GGBotNet | SIL Open Font License 1.1 (free to use, embed and share with the software; the font may not be sold on its own) | https://ggbot.itch.io/ithaca-font |

Times New Roman, Consolas, Segoe UI and Comic Sans MS are **not** included in this project. They are only used when your device already has them installed, so there is nothing to license or redistribute according to Microsoft.

### Your own files
Music, sounds, fonts, icons, cursors and backgrounds you upload stay in your browser only. They are never uploaded to a server or shared. You are responsible for having the right to use them. Replay (`.mire`), settings (`.mise`) and board seed (`.mifi`) files contain only game data, no copyrighted material.

### Other assets
Sound effects in `audio/` are no copyrighted now, sources scatter around the Internet 

Icons and Cursors in `assets/` follow Flaticon's copyright, provide free use for comercial and personal purpose | https://www.flaticon.com/

## File formats

All three are UTF-8 JSON and start with a `format` field. They are checked before use.

| Extension | `format` | What it holds |
|---|---|---|
| `.mire` | `mire` (version 1) | `rows`, `cols`, `mines`, `safety`, `noGuess`, `seed`, `hints`, `result`, `ms` and `moves` (a list of `[kind, cell, ms]`; kind is `r` open, `f` flag, `c` chord) |
| `.mise` | `mise` (version 1) | `settings`: the saved settings object |
| `.mifi` | `mifi` (version 1) | `rows`, `cols`, `mines`, `safety`, `noGuess`, `seed` and `first` (the cell opened first; the board is dealt from it) |

A board is fully decided by its size, mines, first-click mode, board type, seed and first cell. A future version that changes the dealing or the solver would bump the file version.
