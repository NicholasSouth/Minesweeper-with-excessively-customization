"use strict";

/* Audio tab: volume sliders, sound rows, pre-listen */

/* AUDIO TAB: Volume */
panel.querySelectorAll('input[data-ch]').forEach(inp => {
    const ch = inp.dataset.ch, out = $('#out-' + ch);
    inp.value = S.vol[ch];
    out.textContent = S.vol[ch] + '%';
    inp.oninput = () => {
        S.vol[ch] = +inp.value;
        out.textContent = inp.value + '%';
        applyAudio();
        if (pvId) pv.volume = vol(SLOT[pvId].ch);   // keep the preview in step
        save();
    };
    // hear the new level (music and video play on their own)
    inp.onchange = () => {
        if (ch === 'music' || ch === 'video') return;
        sfx(SLOT[ch] ? ch : 'ui');
    };
});
/* AUDIO TAB: Sounds (one row per slot: play, upload, reset) */
const sndMsg = $('#snd-msg');
const say = t => { sndMsg.textContent = t; };
const rows = {};
function refreshRow(id) {
    const r = rows[id], c = custom[id];
    const nm = c ? c.name : id === 'music' ? track().label : 'Default';
    r.name.textContent = nm;
    r.name.title = nm;
    r.reset.disabled = !c;
}
function setCustom(id, blob, name) {
    pvClear(id);   // the preview may be using the old file
    if (custom[id]) URL.revokeObjectURL(custom[id].url);
    custom[id] = { url: URL.createObjectURL(blob), name };
    loadSlot(id);
    refreshRow(id);
    if (id === 'music') applyAudio();
}
// pre-listen: one sound at a time
const pv = new Audio();
pv.preload = 'auto';
let pvId = null; // slot being previewed
const pvSrc = id => (custom[id] && custom[id].url) || SLOT[id].src;
function paintPreview() {
    SLOTS.forEach(s => {
        const playing = pvId === s.id && !pv.paused && !pv.ended;
        rows[s.id].play.textContent = playing ? 'Stop' : 'Play';
        if (playing) rows[s.id].el.dataset.active = ''; else delete rows[s.id].el.dataset.active;
    });
}
function pvToggle(id) {
    if (pvId === id && !pv.paused && !pv.ended) {
        pvStop();
        return;
    }
    const was = pvId;
    pvId = id;
    pv.src = pvSrc(id);
    pv.volume = vol(SLOT[id].ch);
    if (was === 'music' && id !== 'music') applyAudio();   // give the background track back
    pv.play().catch(() => {});
    paintPreview();
}
function pvStop() {
    if (!pvId) return;
    const wasMusic = pvId === 'music';
    pv.pause();
    pv.currentTime = 0;
    pvId = null;
    if (wasMusic) applyAudio();
    paintPreview();
}
function pvClear(id) { // drop the loaded sound when its file is replaced or reset
    if (pvId !== id) return;
    pv.removeAttribute('src');
    pv.load();
    pvStop();
}
// the background track pauses while the music slot previews
pv.onplay = () => {
    if (pvId === 'music') bgm.pause();
    paintPreview();
};
pv.onpause = () => {
    if (pvId === 'music') applyAudio();
    paintPreview();
};
pv.onended = () => {
    if (pvId === 'music') applyAudio();
    paintPreview();
};
SLOTS.forEach(s => {
    const el = document.createElement('div');
    el.className = 'snd';
    el.innerHTML =
        '<div class="snd-top"><span class="snd-label"></span><span class="snd-name"></span></div>' +
        '<div class="snd-btns">' +
        '<button type="button" class="small play">Play</button>' +
        '<button type="button" class="small up">Upload</button>' +
        '<button type="button" class="small rst">Reset</button>' +
        '</div>' +
        '<input type="file" accept="audio/*" tabindex="-1">';
    const file = el.querySelector('input');
    el.querySelector('.snd-label').textContent = s.label;
    file.setAttribute('aria-label', 'Upload sound for ' + s.label);
    rows[s.id] = { 
                    el, name: el.querySelector('.snd-name'), 
                    reset: el.querySelector('.rst'), 
                    play: el.querySelector('.play') 
                 };
    if (s.id === 'music') { // choose one of the shipped tracks
        const sel = document.createElement('select');
        sel.setAttribute('aria-label', 'Music track');
        TRACKS.forEach(t => sel.add(new Option(t.label, t.id)));
        sel.value = S.track;
        sel.onchange = () => {
            S.track = sel.value;
            save();
            pvClear('music');
            if (!custom.music) loadSlot('music'); // an uploaded file keeps playing until it is reset
            refreshRow('music');
            applyAudio();
            say('Music: ' + track().label + (custom.music ? ' (your uploaded file is still in use; press Reset to hear it).' : '.'));
        };
        el.insertBefore(sel, el.querySelector('.snd-btns'));
    }
    el.querySelector('.play').onclick = () => pvToggle(s.id);
    el.querySelector('.up').onclick = () => file.click();
    file.onchange = () => {
        const f = file.files[0];
        file.value = ''; // allow picking the same file again
        if (!f) return;
        if (!f.type.startsWith('audio/')) return say(f.name + ' is not an audio file.');
        if (f.size > MAX_UPLOAD) return say(f.name + ' is larger than 8 MB.');
        setCustom(s.id, f, f.name);
        say(s.label + ': using ' + f.name + '.');
        idb.put(s.id, { blob: f, name: f.name }).catch(() => {
            say(s.label + ': using ' + f.name + ', but it could not be saved and will reset when you reload.');
        });
    };
    el.querySelector('.rst').onclick = () => {
        if (!custom[s.id]) return;
        pvClear(s.id);
        URL.revokeObjectURL(custom[s.id].url);
        delete custom[s.id];
        loadSlot(s.id);
        refreshRow(s.id);
        if (s.id === 'music') applyAudio();
        idb.del(s.id).catch(() => {});
        say(s.label + (s.id === 'music' ? ': back to ' + track().label + '.' : ': back to the default sound.'));
    };
    $('#sounds').appendChild(el);
    refreshRow(s.id);
});
