"use strict";

/* Theme tab: colors and scrollbars */

/* THEME TAB: Colors (overrides saved per theme, set inline on <html>) */
const HEX = /^#[0-9a-f]{6}$/i;
const COLOR_KEYS = [
    ['bg', 'Page background'], ['surface', 'Panels'], ['text', 'Text'], ['accent', 'Accent'],
    ['hid', 'Hidden cells'], ['rev', 'Revealed cells'], ['danger', 'Mine hit'],
    ['glow1', 'Glow tail'], ['glow2', 'Glow head'],
    ['n1', 'Number 1'], ['n2', 'Number 2'], ['n3', 'Number 3'], ['n4', 'Number 4'],
    ['n5', 'Number 5'], ['n6', 'Number 6'], ['n7', 'Number 7'], ['n8', 'Number 8']
];
const SB_KEYS = [['sbthumb', 'Thumb'], ['sbtrack', 'Track']]; // scrollbar colors (own section)
const ALL_KEYS = COLOR_KEYS.concat(SB_KEYS);
const DERIVED = ['hidh', 'muted']; // recomputed when the colors above are customised
{ // drop anything in storage that is not a known theme / key / hex color
    const clean = {};
    const saved = S.colors && typeof S.colors === 'object' ? S.colors : {};
    themes.forEach(t => {
        const o = {};
        ALL_KEYS.forEach(([k]) => { if (saved[t] && HEX.test(saved[t][k])) o[k] = saved[t][k]; });
        if (Object.keys(o).length) clean[t] = o;
    });
    S.colors = clean;
}
const toHex = v => HEX.test(v) ? v : /^#[0-9a-f]{3}$/i.test(v) ?
             '#' + [...v.slice(1)].map(c => c + c).join('') : '#000000';
const colorInputs = {};
[[COLOR_KEYS, '#colors'], [SB_KEYS, '#sb-colors']].forEach(([list, box]) => list.forEach(([k, name]) => {
    const l = document.createElement('label');
    const inp = document.createElement('input');
    const t = document.createElement('span');
    inp.type = 'color';
    inp.setAttribute('aria-label', name + ' color');
    t.textContent = name;
    l.append(inp, t);
    inp.oninput = () => {
        (S.colors[S.theme] = S.colors[S.theme] || {})[k] = inp.value;
        applyColors();
        save();
    };
    colorInputs[k] = inp;
    $(box).appendChild(l);
}));
// mix two #rrggbb colors in JS (p = share of a), so derived colors are plain hex, not CSS color-mix
const mixHex = (a, b, p) => '#' + [1, 3, 5].map(i => Math.round(
    parseInt(toHex(a).slice(i, i + 2), 16) * p + parseInt(toHex(b).slice(i, i + 2), 16) * (1 - p)
).toString(16).padStart(2, '0')).join('');
function applyColors() {
    const st = root.style;
    ALL_KEYS.forEach(([k]) => st.removeProperty('--' + k));
    DERIVED.forEach(k => st.removeProperty('--' + k));
    const cs = getComputedStyle(root), ov = S.colors[S.theme] || {};
    ALL_KEYS.forEach(([k]) => {
        colorInputs[k].value = toHex(ov[k] || cs.getPropertyValue('--' + k).trim()); // picker shows the effective color
    });
    Object.keys(ov).forEach(k => st.setProperty('--' + k, ov[k]));
    const eff = k => ov[k] || cs.getPropertyValue('--' + k).trim();
    if (ov.hid) st.setProperty('--hidh', mixHex(ov.hid, '#ffffff', .85)); // hover: a bit lighter
    if (ov.text || ov.surface) st.setProperty('--muted', mixHex(eff('text'), eff('surface'), .62));
    $('#cur-theme').textContent = S.theme;
}
$('#colors-reset').onclick = () => {
    delete S.colors[S.theme];
    applyColors();
    save();
    sfx('ui');
};
/* THEME TAB: Scrollbars (colors live in S.colors above, the thickness is S.sbSize) */
S.sbSize = num(S.sbSize, 4, 16, DEF.sbSize);
function applySb() {
    root.style.setProperty('--sbsz', S.sbSize + 'px');
    root.dataset.sb = S.sbSize <= 8 ? 'thin' : 'auto'; // Firefox only
    $('#sb-size').value = S.sbSize;
    $('#out-sbsz').textContent = S.sbSize + ' px';
}
$('#sb-size').oninput = e => {
    S.sbSize = +e.target.value;
    applySb();
    save();
};
$('#sb-reset').onclick = () => {
    if (S.colors[S.theme]) SB_KEYS.forEach(([k]) => { delete S.colors[S.theme][k]; });
    if (S.colors[S.theme] && !Object.keys(S.colors[S.theme]).length) delete S.colors[S.theme];
    S.sbSize = DEF.sbSize;
    applyColors();
    applySb();
    save();
    sfx('ui');
};
applySb();
