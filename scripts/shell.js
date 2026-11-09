"use strict";

/* Shared DOM helpers + state, app background video, header (theme dots, mute, gear) */

/* UI: shared helpers + state */
const $ = s => document.querySelector(s);
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const rnd = (a, b) => a + Math.random() * (b - a);
let g, cells = [], cur = 0, t0 = 0, tick = 0;
let origin = 0; // cell the last action started from; animations ripple out from it
let flagMode = false, lp = 0, lpFired = false;
let zoom = 1, csNow = 32, lastDims = '', builtDims = '';

/* 
    APP BACKGROUND  (#appbg, #app-video)
    Video helpers are shared with the board video (#board-video).
*/
const av = $('#app-video'), bv = $('#board-video');
function setVideo(v, url) {
    v.src = url;
    v.hidden = false;
}
function clearVideo(v) {
    if (v.hasAttribute('src')) {
        v.pause();
        v.removeAttribute('src');
        v.load();
    }
    v.hidden = true;
}
// sound follows the Background video slider and the global mute
function applyVideos() {
    [[bv, S.boardVideoMuted], [av, S.appVideoMuted]].forEach(([v, off]) => {
        v.volume = vol('video');
        v.muted = off || S.muted || !audioUnlocked;
        if (!v.hidden && v.hasAttribute('src')) v.play().catch(() => {});
    });
}

/* HEADER  (theme dots, mute, settings button) */
const themes = ['novel', 'lust', 'combust', 'ethereal'];
if (!themes.includes(S.theme)) {
    S.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'novel' : 'ethereal';
}
const SW = { novel: '#2fbfff', lust: '#d64fb0', combust: '#f08a24', ethereal: '#d9d2bf' };
themes.forEach(t => {
    const b = document.createElement('button');
    b.className = 'dot';
    b.style.background = SW[t];
    b.title = t;
    b.setAttribute('aria-label', t + ' theme');
    b.onclick = () => {
        S.theme = t;
        applyTheme();
        save();
        sfx('ui');
    };
    $('#theme').appendChild(b);
});
function applyTheme() {
    root.dataset.theme = S.theme;
    [...$('#theme').children].forEach((b, i) => 
        b.setAttribute('aria-pressed', themes[i] === S.theme));
    applyColors(); // each theme keeps its own custom colors
}
function applyMute() {
    $('#mute').dataset.muted = S.muted;
    $('#mute').setAttribute('aria-label', S.muted ? 'Sound off, press to turn on' : 
        'Sound on, press to turn off');
}
$('#mute').onclick = () => {
    S.muted = !S.muted;
    applyMute();
    applyAudio();
    save();
    sfx('ui');
};
const gear = $('#settings-btn');
// see section 5
gear.onclick = () => {
    toggleSettings(!isOpen());
    sfx('ui');
};
