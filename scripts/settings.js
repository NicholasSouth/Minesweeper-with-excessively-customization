"use strict";

/* Storage helper, default values and the saved settings object (S) */

/* CORE: storage + settings */
const store = {
    get(k, d) {
        try {
            const v = JSON.parse(localStorage.getItem('msweeper:' + k));
            return v && v.schemaVersion === 1 ? v : d;
        } catch (e) {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem('msweeper:' + k, JSON.stringify({ ...v, schemaVersion: 1 }));
        } catch (e) {}
    }
};
const num = (v, a, b, d) => Number.isFinite(+v) ? Math.min(b, Math.max(a, Math.round(+v))) : d;
// Default values for the sidebar settings (also used by "Reset all appearance").
// Saved settings in this browser override them; clear the site data to see new defaults.
const DEF = {
    vol: { 
        master: 100, sfx: 50, reveal: 50, chord: 50, flag: 100, ui: 50, 
        explode: 100, win: 100, lose: 50, music: 30, video: 50 
    },
    curSize: 25,
    sbSize: 10,
    dim: 0,
    appDim: 0,
    fx: { cell: true, button: true, flag: true, win: true, lose: true, glow: true, wipe: true }
};
const S = Object.assign({
    difficulty: 'beginner',
    rows: 16,
    cols: 16,
    mines: 40,
    pct: 15.6,
    mode: 'count',
    safety: 'zone',
    noGuess: true,
    theme: null,
    muted: false
}, store.get('settings', {}));
S.rows = num(S.rows, 5, 50, 16);
S.cols = num(S.cols, 5, 50, 16);
if (!['beginner', 'intermediate', 'expert', 'custom'].includes(S.difficulty)) 
    S.difficulty = 'beginner';
if (!RES[S.safety]) S.safety = 'zone';
S.noGuess = S.noGuess !== false;
S.mines = clampMines(S.mines, S.rows, S.cols, S.safety);
{
    const sv = S.vol || {};
    S.vol = {};
    Object.keys(DEF.vol).forEach(k => { S.vol[k] = num(sv[k], 0, 100, DEF.vol[k]); });
}
const save = () => store.set('settings', S);
