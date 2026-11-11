"use strict";

/* Files: settings (.mise) and board seeds (.mifi). Replays (.mire) live in replay.js. */

/*
    .mise  your settings (everything saved in this browser except uploaded sounds, fonts and images)
    .mifi  a board seed: size, mines, first-click mode, board type, the random seed and the
           first cell. The first click deals the board, so the cell is part of the seed: loading
           a .mifi gives everybody exactly the same board with that cell already opened.
    Both are plain JSON, checked before use, so a broken or foreign file gives a message.
*/
const MISE_VERSION = 1, MIFI_VERSION = 1, FILE_MAX = 2 * 1024 * 1024;
const fileStamp = () => new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
async function readJsonFile(f, ext) {
    if (f.size > FILE_MAX) throw new Error('That file is too big to be a .' + ext + ' file.');
    try {
        return JSON.parse(await f.text());
    } catch (err) {
        throw new Error('This is not a .' + ext + ' file.');
    }
}

/* ---- settings (.mise) ---- */
const miseSay = t => { $('#mise-msg').textContent = t; };
const kindOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
function parseSettings(o) {
    if (!o || typeof o !== 'object' || o.format !== 'mise') throw new Error('This is not a .mise settings file.');
    if (o.version !== MISE_VERSION) throw new Error('This settings file was made by a different version.');
    const s = o.settings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('This settings file has no settings in it.');
    const out = JSON.parse(JSON.stringify(S));
    let used = 0;
    for (const k of Object.keys(s)) {
        // only settings this version knows, of the same kind; the modules clean the details on load
        if (!Object.prototype.hasOwnProperty.call(S, k) || kindOf(s[k]) !== kindOf(S[k])) continue;
        out[k] = s[k];
        used++;
    }
    if (!used) throw new Error('No setting in this file is recognised.');
    return out;
}
$('#mise-export').onclick = () => {
    const o = { format: 'mise', version: MISE_VERSION, app: 'Minesweeper', created: new Date().toISOString(),
        settings: JSON.parse(JSON.stringify(S)) };
    const name = 'minesweeper-settings-' + fileStamp() + '.mise';
    saveFile(new Blob([JSON.stringify(o)], { type: 'application/json' }), name);
    miseSay('Saved ' + name + '. Uploaded sounds, fonts and images are not included.');
    sfx('ui');
};
$('#mise-import').onclick = () => $('#mise-file').click();
$('#mise-file').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
        const next = parseSettings(await readJsonFile(f, 'mise'));
        if (!confirm('Replace your current settings with the ones in ' + f.name + '? The page reloads and a game in progress is lost.')) return;
        store.set('settings', next);
        miseSay('Loaded ' + f.name + '. Reloading...');
        sfx('ui');
        setTimeout(() => location.reload(), 500);
    } catch (err) {
        miseSay(err.message);
    }
};

/* ---- board seed (.mifi) ---- */
const seedSay = t => { $('#seed-msg').textContent = t; };
const seedBtn = { exp: $('#seed-export'), imp: $('#seed-import'), file: $('#seed-file') };
// the board on screen: the live game once its first cell is open, or the replay that is playing
function seedSource() {
    if (replaying) {
        const m = rpData && rpData.moves.find(x => x.k === 'r');
        return m ? { d: rpData, first: m.i } : null;
    }
    return g && g.first >= 0 ? { d: g, first: g.first } : null;
}
function paintSeed() {
    const off = !seedSource();
    if (seedBtn.exp.disabled !== off) seedBtn.exp.disabled = off;
    seedBtn.exp.title = off ? 'Open a cell first: your first click deals the board' : '';
}
function parseSeed(o) {
    if (!o || typeof o !== 'object' || o.format !== 'mifi') throw new Error('This is not a .mifi board seed file.');
    if (o.version !== MIFI_VERSION) throw new Error('This board seed was made by a different version.');
    const rows = +o.rows, cols = +o.cols, mines = +o.mines, seed = +o.seed, first = +o.first;
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 5 || cols < 5 || rows > 50 || cols > 50)
        throw new Error('The board size in this file is not valid.');
    if (!RES[o.safety]) throw new Error('The first-click mode in this file is not valid.');
    if (!Number.isInteger(mines) || mines < 1 || mines > maxMines(rows, cols, o.safety))
        throw new Error('The mine count in this file is not valid.');
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('The seed in this file is not valid.');
    if (!Number.isInteger(first) || first < 0 || first >= rows * cols) throw new Error('The first cell in this file is not valid.');
    if (typeof o.noGuess !== 'boolean') throw new Error('The board type in this file is not valid.');
    return { rows, cols, mines, safety: o.safety, noGuess: o.noGuess, seed, first };
}
seedBtn.exp.onclick = () => {
    const s = seedSource();
    if (!s) return;
    const d = s.d, o = { format: 'mifi', version: MIFI_VERSION, app: 'Minesweeper', created: new Date().toISOString(),
        rows: d.rows, cols: d.cols, mines: d.mines, safety: d.safety, noGuess: !!d.noGuess, seed: d.seed, first: s.first };
    const name = 'minesweeper-' + d.rows + 'x' + d.cols + '-seed-' + fileStamp() + '.mifi';
    saveFile(new Blob([JSON.stringify(o)], { type: 'application/json' }), name);
    seedSay('Saved ' + name + '. Anyone who loads it gets this exact board.');
    sfx('ui');
};
seedBtn.imp.onclick = () => seedBtn.file.click();
seedBtn.file.onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
        const d = parseSeed(await readJsonFile(f, 'mifi'));
        if (liveGame() && !confirm('A game is in progress. Loading a board seed will end it. Continue?')) return;
        const hit = Object.entries(PRE).find(([, v]) => v[0] === d.rows && v[1] === d.cols && v[2] === d.mines);
        Object.assign(S, {
            difficulty: hit ? hit[0] : 'custom', rows: d.rows, cols: d.cols, mines: d.mines,
            mode: 'count', pct: minesToPct(d.mines, d.rows, d.cols), safety: d.safety, noGuess: d.noGuess
        });
        sync();
        start({ seed: d.seed });
        doReveal(d.first); // the first click is part of the seed
        seedSay('Loaded ' + f.name + '. The first cell is already open.');
        sfx('ui');
    } catch (err) {
        seedSay(err.message);
    }
};
paintSeed();
