# Minesweeper (with excessive customization) v1.1

A browser Minesweeper with a lot of knobs: custom boards, a movable and resizable board, zoom, themes, fonts, sounds, cursors, backgrounds, and a replay of every finished game that you can save, share and load.

**Play it:** https://nicholassouth.github.io/Minesweeper-with-excessively-customization/

No install, no build step, no account. Everything runs in your browser.

---

## What's new in v1.1

- **Replay section** under the board: watch your last game in a loop with a VHS look, change the speed, **export it as a `.misw` file** and **import** any `.misw` file to watch it.
- **Boards fit the screen:** Intermediate and Expert now pick a cell size that shows the whole board without scrollbars.
- **Font size sliders**, with a default size for each font, and a bigger app text by default.
- **New fonts:** the font list is now Two Fifty Six Bytes (default), Times New Roman, Consolas, Segoe UI, Ithaca and Comic Sans MS, and the fonts that ship with the site are free to use (see [Credits and licenses](#credits-and-licenses)).
- **New music:** two background tracks to choose from, **Classic** (default) and **Dreams**. You can still upload your own.
- **Credits** for all music and fonts, in this README and in the in-app credits popup (click the app name).
- Replaced the previous background music and the Twobit and Minecraft fonts with the music and fonts credited below.

---

## How to play

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Open a cell | Left-click or tap | `D` or `Space` |
| Flag a cell | Right-click or long-press | `F` |
| Chord (open all neighbours of a satisfied number) | Click the number | `C` |
| Move the keyboard cursor | | Arrow keys |
| New game | Face button or **New game** | `R` |
| Zoom in / out | `+` / `-` buttons, Ctrl + wheel, pinch | `+` / `-` |
| Reset zoom | **Reset view** | `0` |
| Move the board | Drag the grip bar above it | Arrow keys on the grip bar |
| Reset board position and size | **Reset layout**, or double-click the grip bar | `Home` on the grip bar |

Clicking a flagged cell removes the flag and opens the cell. **Flag mode** turns every tap into a flag, which is handy on touch screens.

---

## Features

### Game setup
- **Presets:** Beginner (9x9, 10 mines), Intermediate (16x16, 40), Expert (16x30, 99).
- **Custom boards:** set rows, columns and mines directly, by percentage, or with the slider. **Edit as custom** copies the current preset into the custom fields.
- **Difficulty readout** with a warning when the mine density is above 35%, where most boards can't be solved without guessing.
- **First-click protection:** Safe zone (3x3), Safe cell, or No protection.
- **Best time** is remembered for each board setup.
- **Face button** reacts to your clicks and to winning or losing.

### Board
- **Fits your screen:** the board picks the biggest cell size that shows the whole board without scrollbars, including Intermediate and Expert on laptop screens.
- **Mine counter and timer** in a HUD above the board.
- **Zoom** with buttons, Ctrl + wheel, trackpad or touch pinch, or the keyboard. Drag the board to pan.
- **Movable board:** drag the grip bar to place it anywhere.
- **Resizable board:** drag the corner handle.
- **Chording** and **flag mode** for fast play.
- **Full keyboard play** with a visible keyboard cursor.

### Replay
Every move you make (open, flag, chord) is recorded. The **Replay** section under the board is where you use it:
- **Watch replay / Stop replay:** plays the last finished game on the board in a loop with a VHS-style effect (scanlines, tracking bar, grain, colour fringing, a blinking PLAY label). Stop replay (or New game) deals a fresh board.
- **Replay automatically when a game ends:** on by default; untick it if you'd rather start the replay yourself.
- **Speed:** 0.5×, 1×, 2×, 4× or 8×.
- **Export .misw:** saves the replay as a small `.misw` file (it is plain JSON: board size, mines, first-click mode, the random seed and the list of moves).
- **Import .misw:** loads a `.misw` file and plays it, even if it was made on another board size or by someone else. Files are checked first, so a broken or foreign file gives an error message instead of a broken board.
- The last replay is kept in your browser, so it is still there after a reload.

### Themes and colours
- Four built-in themes: **Novel**, **Lust**, **Combust**, **Ethereal**. Switch with the dots in the header.
- **Edit any colour** of the current theme. Each theme keeps its own colours, with a reset button.

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
- **Everything is saved in your browser:** settings, colours, fonts, uploads and best times stay on your device. Nothing is sent to a server, and other visitors never see your changes.
- **Reset all appearance** puts colours, fonts, icons and backgrounds back to the defaults.
- Click the app name in the header for the credits.

---

## Running it locally

It is plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder (for example `python -m http.server`) if your browser blocks local font or audio files.

```
index.html
styles/main.css
scripts/main.js
fonts/      TwofiftysixbytesRegular-5yD0j.otf, Ithaca-LVB75.ttf
assets/     icons, cursors and images
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
