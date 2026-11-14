"use strict";

/*
    SERVICE WORKER: after the first visit the game loads from the device instead of the network.
    - BUMP VERSION on every release (that is what makes players get the new files).
    - Everything below is cached except the two long music tracks (several MB each, streamed from the network).
*/
const VERSION = 'v5.1';
const SHELL = [
    './', 'index.html',
    'styles/themes.css', 'styles/base.css', 'styles/app.css', 'styles/popups.css', 'styles/setup.css',
    'styles/board.css', 'styles/replay.css', 'styles/sidebar.css', 'styles/tabs.css',
    'styles/cursor.css', 'styles/scroll.css', 'styles/motion.css',
    'scripts/engine.js', 'scripts/deal.js', 'scripts/settings.js', 'scripts/audio.js',
    'scripts/shell.js', 'scripts/setup.js', 'scripts/layout.js', 'scripts/hud-zoom.js',
    'scripts/board.js', 'scripts/replay.js', 'scripts/keys.js', 'scripts/hint.js',
    'scripts/board-input.js', 'scripts/effects.js', 'scripts/sidebar.js', 'scripts/audio-tab.js',
    'scripts/theme-colors.js', 'scripts/fonts.js', 'scripts/assets.js', 'scripts/cursor.js',
    'scripts/backgrounds.js', 'scripts/credits.js', 'scripts/guide.js', 'scripts/files.js',
    'scripts/boot.js', 'scripts/deal-worker.js',
    'assets/app-icon.ico', 'assets/bomb.webp', 'assets/cursor-flag.webp', 'assets/cursor-hold.webp',
    'assets/cursor-normal.webp', 'assets/cursor-select.webp', 'assets/cursor-text.webp',
    'assets/face-default.webp', 'assets/face-die.webp', 'assets/face-oh.webp', 'assets/face-win.webp',
    'assets/flag-cell.webp', 'assets/flag-icon.webp', 'assets/settings.webp',
    'assets/speaker-default.webp', 'assets/speaker-mute.webp', 'assets/x.webp', 'fonts/ithaca.woff2',
    'fonts/twofiftysixbytes.woff2',
    'audio/select.mp3', 'audio/flag.mp3', 'audio/explosion.mp3', 'audio/win.mp3', 'audio/loose.mp3',
];

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const cache = await caches.open(VERSION);
        // one by one: a file name that is wrong or missing must not stop the whole install.
        // cache:'reload' skips the browser's own HTTP cache so a new version really downloads new files
        await Promise.allSettled(SHELL.map(async url => {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (res.ok) await cache.put(url, res);
        }));
        self.skipWaiting(); // new version takes over right away; players see it on their next reload
    })());
});

self.addEventListener('activate', e => {
    e.waitUntil((async () => {
        for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // not ours: normal network
    e.respondWith(handle(req));
});

async function handle(req) {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return req.headers.has('range') ? sliced(req, hit) : hit;
    const res = await fetch(req); // not cached (music, a file not in the list...): network as usual
    // files that were missing from SHELL get cached the first time they are used (never audio/video: they stream)
    if (res.ok && res.status === 200 && !['audio', 'video'].includes(req.destination)) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
}

/* Audio elements ask for "bytes=0-" style ranges and Safari refuses a full 200 answer, so cut the cached file */
async function sliced(req, res) {
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
    if (!m) return res;
    const buf = await res.arrayBuffer(), size = buf.byteLength;
    let start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; } // "last N bytes"
    if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(buf.slice(start, end + 1), {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
        },
    });
}
