"use strict";

/* Audio engine: sound slots, IndexedDB uploads, volume, music */

/* 
    CORE: audio engine
    Each sound is a slot: default file, sidebar label, volume channel.
    To add one: drop the file in /audio and add a line to SLOTS. 
*/
// the two background tracks that ship with the site (a user upload still overrides them)
const TRACKS = [
    { id: 'classic', label: 'Joakim Karud - Classic', src: 'audio/Joakim_Karud_-_Classic.mp3' },
    { id: 'dreams',  label: 'Dj Quads - Dreams',      src: 'audio/Dj_Quads_-_Dreams.mp3' }
];
if (!TRACKS.some(t => t.id === S.track)) S.track = 'classic'; // default track
const track = () => TRACKS.find(t => t.id === S.track);
const SLOTS = [
    { id: 'reveal',  label: 'Reveal cell',     src: 'audio/select.mp3',      ch: 'reveal'  },
    { id: 'chord',   label: 'Chord',           src: 'audio/select.mp3',      ch: 'chord'   },
    { id: 'flag',    label: 'Flag',            src: 'audio/flag.mp3',        ch: 'flag'    },
    { id: 'ui',      label: 'Interface click', src: 'audio/select.mp3',      ch: 'ui'      },
    { id: 'explode', label: 'Explosion',       src: 'audio/explosion.mp3',   ch: 'explode' },
    { id: 'win',     label: 'Win',             src: 'audio/win.mp3',         ch: 'win'     },
    { id: 'lose',    label: 'Lose',            src: 'audio/loose.mp3',       ch: 'lose'    },
    { id: 'music',   label: 'Music',           get src() { return track().src; }, ch: 'music' }
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const MAX_UPLOAD = 8 * 1024 * 1024;   // 8 MB
const custom = {}; // slot id -> { url, name } (uploaded sounds)
const base = {}; // slot id -> Audio element in use
let bgm = null;
let audioUnlocked = false;   // browsers allow sound only after a first click/key
// IndexedDB: uploads are too big for localStorage
const idb = {
    db: null,
    open() {
        if (this.db) return this.db;
        this.db = new Promise((res, rej) => {
            if (!window.indexedDB) return rej(new Error('no indexedDB'));
            const q = indexedDB.open('msweeper-audio', 1);
            q.onupgradeneeded = () => q.result.createObjectStore('sounds');
            q.onsuccess = () => res(q.result);
            q.onerror = () => rej(q.error);
        });
        return this.db;
    },
    run(mode, fn) {
        return this.open().then(db => new Promise((res, rej) => {
            const tx = db.transaction('sounds', mode);
            const r = fn(tx.objectStore('sounds'));
            tx.oncomplete = () => res(r && r.result);
            tx.onerror = tx.onabort = () => rej(tx.error);
        }));
    },
    put: (k, v) => idb.run('readwrite', s => s.put(v, k)),
    del: k => idb.run('readwrite', s => s.delete(k)),
    all() {
        return idb.run('readonly', s => s.getAll()).then(async vals => {
            const keys = await idb.run('readonly', s => s.getAllKeys());
            return keys.map((k, i) => [k, vals[i]]);
        });
    }
};
// these are also scaled by the "All sound effects" slider
const GROUPED = ['reveal', 'chord', 'flag', 'ui', 'explode', 'win', 'lose'];
const vol = ch => (S.vol.master / 100) * (S.vol[ch] / 100) * 
            (GROUPED.includes(ch) ? S.vol.sfx / 100 : 1);
function loadSlot(id) { // (re)build the Audio element for a slot
    const old = base[id];
    const a = new Audio((custom[id] && custom[id].url) || SLOT[id].src);
    a.preload = 'auto';
    if (id === 'music') {
        a.loop = true;
        if (old) old.pause();
        bgm = a;
    }
    base[id] = a;
}
SLOTS.forEach(s => loadSlot(s.id));
function sfx(k) {
    const slot = SLOT[k];
    if (S.muted || !slot || !base[k]) return; // unknown keys stay silent
    const a = base[k].cloneNode(); // clone so quick repeats overlap
    a.volume = vol(slot.ch);
    a.play().catch(() => {});
}
function applyAudio() {
    bgm.volume = vol('music');
    if (S.muted || !audioUnlocked) bgm.pause();
    else bgm.play().catch(() => {});
    applyVideos();
}
const unlockAudio = () => {
    audioUnlocked = true;
    applyAudio();
};
['pointerdown', 'keydown'].forEach(t => addEventListener(t, unlockAudio, { once: true }));
