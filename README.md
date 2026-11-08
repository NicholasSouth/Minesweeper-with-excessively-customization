# Minesweeper (with excessive customization)

A browser Minesweeper with a lot of knobs: custom boards, a movable and resizable board, zoom, themes, fonts, sounds, cursors, backgrounds, and an automatic replay of every finished game.

**Play it:** https://nicholassouth.github.io/Minesweeper-with-excessively-customization/

No install, no build step, no account. Everything runs in your browser.

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
- **Mine counter and timer** in a HUD above the board.
- **Zoom** with buttons, Ctrl + wheel, trackpad or touch pinch, or the keyboard. Drag the board to pan.
- **Movable board:** drag the grip bar to place it anywhere.
- **Resizable board:** drag the corner handle.
- **Chording** and **flag mode** for fast play.
- **Full keyboard play** with a visible keyboard cursor.

### Replay
- Every move you make (open, flag, chord) is recorded.
- When you win or lose, the finished game **replays automatically in a loop** on the board with a VHS-style effect (scanlines, tracking bar, grain, colour fringing, a blinking PLAY label).
- Start a new game to stop the replay.

### Themes and colours
- Four built-in themes: **Novel**, **Lust**, **Combust**, **Ethereal**. Switch with the dots in the header.
- **Edit any colour** of the current theme. Each theme keeps its own colours, with a reset button.

### Fonts
- Choose the app font and the board/counter font separately from: **Twobit**, **Times New Roman**, **Consolas**, **Segoe UI**, **Minecraft**, **Comic Sans MS**.
- **Size sliders** for each, and each font has its own sensible default size.
- **Upload your own font** (`.ttf`, `.otf`, `.woff`, `.woff2`, up to 8 MB).

### Audio
- Volume sliders for master, all sound effects, and each effect individually (reveal, chord, flag, interface click, explosion, win, lose), plus music and background video.
- **Replace any sound with your own file** (mp3, wav or ogg, up to 8 MB).
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
fonts/      Twobit.otf, Minecraft.ttf
assets/     icons, cursors and images
audio/      sounds and music
```

## Credits

Intellectual property of Nguyen Thien Nhan, HCMUTE-24110114.
