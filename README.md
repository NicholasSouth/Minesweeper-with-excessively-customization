# Minesweeper (with excessive customization) v3.1

A browser Minesweeper with a lot of knobs: custom boards, a movable and resizable board, zoom, themes, fonts, sounds, cursors, backgrounds, rebindable keys, and a replay of every finished game that you can save, share and load.

**Play it:** https://nicholassouth.github.io/Minesweeper-with-excessively-customization/

No install, no build step, no account. Everything runs in your browser.

---

## What's new in v3.1

- **`S` opens and closes the settings menu** (it still closes with Esc and the close button). Closing with `S` hands the keyboard back to the board, so you can keep playing.
- **`M` mutes and unmutes** the sound, the same as the speaker button in the header.
- **Both keys are rebindable** in Settings > Keys, under View. If you had already used `S` or `M` for another action, that action keeps its key and the new one starts empty.
- **Scroll lock fix:** the page could still shift while locked, usually right after a win or a loss. The browser pulls the scroll position up when the page gets shorter (for example when the result message disappears as the replay starts), and code that focuses or scrolls to an element can move the page even with `overflow: hidden`. While locked, the page height is now held and any page scroll is put straight back.
- **New board resets the view:** starting a new game puts the keyboard cursor on the first cell and pans the board window back to the top-left, so the cursor is visible and the next arrow key or zoom doesn't make the board jump. Your zoom level is kept on a same-size board. Watching a replay leaves your cursor where it was.

<details>
<summary>Previous version: v3.0</summary>

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
| Open a cell | Left-click or tap | `D` or `Space` |
| Flag a cell | Right-click or long-press | `F` |
| Chord (open all neighbours of a satisfied number) | Click the number | `C` |
| Jump back to the board | | `C` (when the focus is not on the board) |
| Move the keyboard cursor | | Arrow keys |
| Lock / unlock scrolling | | `L` |
| Open / close settings | Gear button | `S` |
| Mute / unmute | Speaker button | `M` |
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

### Board
- **Fits your screen:** the board picks the biggest cell size that shows the whole board without scrollbars, including Intermediate and Expert on laptop screens.
- **Mine counter and timer** in a HUD above the board.
- **Zoom** with buttons, Ctrl + wheel, trackpad or touch pinch, or the keyboard. Drag the board to pan.
- **Movable board:** drag the grip bar to place it anywhere.
- **Resizable board:** drag the corner handle.
- **Chording** and **flag mode** for fast play.
- **Full keyboard play** with a visible keyboard cursor.
- **Scroll lock** so the page stays still while you play with the keyboard. The page position and height are frozen while it is on, so nothing moves after a win or loss.

### No-guess mode
- After your first click, the game deals a layout and plays it with logic only (no guessing): a number whose mines are all found frees its other neighbours, a number whose hidden cells are all mines marks them, two overlapping numbers are compared (subset rule), and the total mine count is used at the end. If that clears the whole board, you get it. If not, the mines are re-dealt (up to 4000 tries) and checked again.
- The solver is sound: it never calls a board solvable when it needs a guess. It is not complete, so a few guess-free boards that need very advanced reasoning are skipped.
- Typical cost is a few milliseconds. Beginner and Intermediate almost always succeed on the first try or two, Expert needs about 20 tries with Safe zone, and more with Safe cell or No protection (still well under a second).
- **Very dense custom boards** (roughly 20% mines on big boards and up) may not have a guess-free layout within the limit. Then the game uses the layout that logic got furthest on and shows a message that this board may need a guess.
- It is deterministic: the same seed and first click always give the same board, so replays still match exactly.

### Keys
- Every action has **two key slots**: move up/down/left/right, open cell, flag, chord, jump to board, lock scroll, open / close settings, mute, new game, zoom in, zoom out, reset view, reset layout.
- Actions are grouped as **Movement**, **Actions** and **View**.
- Click a slot and press a key to set it. **Backspace** clears the slot, **Esc** (or clicking away) cancels.
- Keys that would break the page (Tab, Esc, Enter, Backspace, Delete and modifier keys) can't be assigned. Ctrl, Cmd and Alt combinations are ignored so browser shortcuts keep working.
- Chord and Jump to board are the only pair that may share a key.
- Your bindings are saved in your browser. **Reset keys** restores the defaults.

### Replay
Every move you make (open, flag, chord) is recorded. The **Replay** section under the board is where you use it:
- **Watch replay / Stop replay:** plays the last finished game on the board in a loop with a VHS-style effect (scanlines, tracking bar, grain, colour fringing, a blinking PLAY label). Stop replay (or New game) deals a fresh board.
- **Replay automatically when a game ends:** on by default; untick it if you'd rather start the replay yourself.
- **Speed:** 0.5×, 1×, 2×, 4× or 8×.
- **Export .misw:** saves the replay as a small `.misw` file (it is plain JSON: board size, mines, first-click mode, board type, the random seed and the list of moves). Files from older versions (format v1) still load as classic boards.
- **Import .misw:** loads a `.misw` file and plays it, even if it was made on another board size or by someone else. Files are checked first, so a broken or foreign file gives an error message instead of a broken board.
- The last replay is kept in your browser, so it is still there after a reload.

### Settings menu
A slide-out bar on the right (open and close it with the gear button, `S` or Esc) with four tabs: **Audio**, **Theme**, **Effects** and **Keys**. Sections glide in as you open the bar or switch tab, and on narrow screens the page behind it is dimmed. The Lock and Jump-to-board keys also close it.

### Themes and colours
- Four built-in themes: **Novel**, **Lust**, **Combust**, **Ethereal**. Switch with the dots in the header.
- **Edit any colour** of the current theme. Each theme keeps its own colours, with a reset button.
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
- Rock splash when opening a cell
- Water ripple on buttons
- Flag drop and lift
- Win animation (confetti, frame pulse, happy face)
- Lose animation (explosion, shake, red flash, popping mines)

Everything also stays off when your system's **reduce motion** setting is on.

### Other
- **Responsive** layout that works on phones and tablets as well as desktops.
- **Everything is saved in your browser:** settings, colours, key bindings, fonts, uploads and best times stay on your device. Nothing is sent to a server, and other visitors never see your changes.
- **Reset all appearance** puts colours, fonts, icons and backgrounds back to the defaults.
- Click the app name in the header for the credits.

---

## Running it locally

It is plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder (for example `python -m http.server`) if your browser blocks local font or audio files.

```
index.html
styles/main.css
scripts/    one file per job, loaded by index.html in this order:
              engine.js        game rules (mines, reveal, chord, win/lose) and the no-guess solver
              settings.js      saved settings and defaults
              audio.js         sound effects and music playback
              shell.js         shared helpers, app background video, header
              setup.js         game setup panel
              layout.js        movable / resizable board
              hud-zoom.js      mine counter, timer, zoom
              board.js         building and drawing the board
              replay.js        recording, VHS replay, .misw export / import
              keys.js          key bindings and the Keys tab
              board-input.js   scroll lock, mouse, touch and keyboard input
              effects.js       animations and the Effects tab
              sidebar.js       the settings bar and its tabs
              audio-tab.js     Audio tab
              theme-colors.js  Theme tab: colours and scrollbars
              fonts.js         fonts and font upload
              assets.js        replaceable icons and images
              cursor.js        custom cursors
              backgrounds.js   board and app backgrounds
              credits.js       credits popup
              boot.js          restores saved uploads and starts the first game
fonts/      TwofiftysixbytesRegular-5yD0j.otf, Ithaca-LVB75.ttf
assets/     icons, cursors and images, app-icon.ico (browser tab icon)
audio/      sound effects, Joakim_Karud_-_Classic.mp3, Dj_Quads_-_Dreams.mp3
```

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
Music, sounds, fonts, icons, cursors and backgrounds you upload stay in your browser only. They are never uploaded to a server or shared. You are responsible for having the right to use them. Replay files (`.misw`) contain only the moves of a game, no copyrighted material.

### Other assets
Sound effects in `audio/` are no copyrighted now, sources scatter around the Internet 

Icons and Cursors in `assets/` follow Flaticon's copyright, provide free use for comercial and personal purpose | https://www.flaticon.com/
