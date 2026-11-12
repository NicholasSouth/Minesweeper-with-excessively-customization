"use strict";

/* Theme tab: app font and board/counter font */

/* THEME TAB: Fonts (app font + board/counter font) */
// ui = default app text size (px), num = default board/counter size (%). Each font has its own.
const FONTS = {
    bytes:    { label: 'Two Fifty Six Bytes', ui: 20, num: 105, stack: '"Two Fifty Six Bytes", monospace' }, // fonts/twofiftysixbytes.woff2
    times:    { label: 'Times New Roman', ui: 20, num: 115, stack: '"Times New Roman", Times, serif' },
    consolas: { label: 'Consolas',        ui: 19, num: 105, stack: 'Consolas, "Courier New", monospace' },
    segoe:    { label: 'Segoe UI',        ui: 18, num: 100, stack: '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif' },
    ithaca:   { label: 'Ithaca',          ui: 24, num: 115, stack: '"Ithaca", sans-serif' }, // fonts/ithaca.woff2
    comic:    { label: 'Comic Sans MS',   ui: 19, num: 100, stack: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive' }
};
const CUSTOM_SIZE = { ui: 18, num: 100 }; // default for an uploaded font
// ui = whole app; num = board digits, mine counter, timer (--font-num)
const T = {
    ui: {
        prop: 'font', def: 'bytes', family: 'MSCustomFont', fallback: 'sans-serif',
        idb: 'font', name: 'App font', sk: 'ui', min: 12, max: 36, step: 1, unit: 'px',
        size: $('#font-size'), sout: $('#out-font-size'), sdef: $('#font-size-def'),
        sel: $('#font-sel'), up: $('#font-up'), rst: $('#font-rst'), 
             file: $('#font-file'), msg: $('#font-msg'), face: null
    },
    num: {
        prop: 'fontNum', def: 'bytes', family: 'MSCustomNumFont', fallback: 'ui-monospace, Menlo, Consolas, monospace',
        idb: 'font-num', name: 'Board and counter font', sk: 'num', min: 60, max: 180, step: 5, unit: '%',
        size: $('#font-num-size'), sout: $('#out-font-num-size'), sdef: $('#font-num-size-def'),
        sel: $('#font-num-sel'), up: $('#font-num-up'), rst: $('#font-num-rst'), 
             file: $('#font-num-file'), msg: $('#font-num-msg'), face: null
    }
};
if (!FONTS[S.font] && S.font !== 'custom') S.font = 'bytes';
if (!FONTS[S.fontNum] && S.fontNum !== 'custom' && S.fontNum !== 'same') S.fontNum = 'bytes';
S.fontSize = S.fontSize || {};
Object.values(T).forEach(t => {
    const old = S.fontSize[t.sk] || {}, clean = {};
    Object.keys(old).forEach(k => { if (FONTS[k] || k === 'custom') { const v = num(old[k], t.min, t.max, null); if (v !== null) clean[k] = v; } });
    S.fontSize[t.sk] = clean;
    t.size.min = t.min; t.size.max = t.max; t.size.step = t.step;
});
// the font whose size applies to a target ("same as app font" uses the app font's board size)
const sizeKey = t => (t === T.num && S.fontNum === 'same' ? S.font : S[t.prop]);
const sizeDef = (t, k) => k === 'custom' ? CUSTOM_SIZE[t.sk] : FONTS[k][t.sk];
const sizeOf = t => { const k = sizeKey(t); return S.fontSize[t.sk][k] ?? sizeDef(t, k); };
Object.values(T).forEach(t => {
    if (t === T.num) t.sel.add(new Option('Same as app font', 'same'));
    Object.keys(FONTS).forEach(k => t.sel.add(new Option(FONTS[k].label, k)));
    t.customOpt = new Option('Uploaded font', 'custom');
    t.sel.add(t.customOpt);
});
function applyFont() {
    Object.values(T).forEach(t => {
        if (S[t.prop] === 'custom' && !t.face) S[t.prop] = t.def; // the uploaded font is gone
        t.sel.value = S[t.prop];
        t.customOpt.disabled = !t.face;
        t.rst.disabled = !t.face;
    });
    const stack = t => S[t.prop] === 'custom' ? '"' + t.family + '", ' + t.fallback : FONTS[S[t.prop]].stack;
    Object.values(T).forEach(t => {
        const v = sizeOf(t);
        t.size.value = v;
        t.sout.textContent = v + (t.unit === '%' ? '%' : ' px');
        t.size.disabled = t === T.num && S.fontNum === 'same';
        t.sdef.disabled = t.size.disabled || S.fontSize[t.sk][sizeKey(t)] === undefined;
    });
    root.style.setProperty('--ui-size', sizeOf(T.ui) + 'px');
    root.style.setProperty('--num-k', sizeOf(T.num) / 100);
    root.style.setProperty('--font-ui', stack(T.ui));
    root.style.setProperty('--font-num', S.fontNum === 'same' ? 'var(--font-ui)' : stack(T.num));
}
async function useFont(t, blob, name) {
    const fontFace = new FontFace(t.family, await blob.arrayBuffer());
    await fontFace.load();
    if (t.face) document.fonts.delete(t.face);
    document.fonts.add(fontFace);
    t.face = fontFace;
    t.msg.textContent = 'Using ' + name + '.';
}
function removeFont(t) {
    if (!t.face) return;
    document.fonts.delete(t.face);
    t.face = null;
    if (S[t.prop] === 'custom') S[t.prop] = t.def;
    applyFont();
    idb.del(t.idb).catch(() => {});
}
Object.values(T).forEach(t => {
    t.sel.onchange = () => {
        S[t.prop] = t.sel.value;
        applyFont();
        save();
        sfx('ui');
    };
    t.size.oninput = () => {
        S.fontSize[t.sk][sizeKey(t)] = +t.size.value;
        applyFont();
        save();
    };
    t.sdef.onclick = () => {
        delete S.fontSize[t.sk][sizeKey(t)];
        applyFont();
        save();
        sfx('ui');
    };
    t.up.onclick = () => t.file.click();
    t.file.onchange = async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        if (f.size > MAX_UPLOAD) {
            t.msg.textContent = f.name + ' is larger than 8 MB.';
            return;
        }
        try {
            await useFont(t, f, f.name);
        } catch (err) {
            t.msg.textContent = f.name + ' is not a usable font file.';
            return;
        }
        S[t.prop] = 'custom';
        applyFont();
        save();
        idb.put(t.idb, { blob: f, name: f.name }).catch(() => {
            t.msg.textContent = 'Using ' + f.name + ', but it could not be saved and will reset when you reload.';
        });
    };
    t.rst.onclick = () => {
        removeFont(t);
        save();
        t.msg.textContent = 'Uploaded font removed.';
        sfx('ui');
    };
});
