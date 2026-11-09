"use strict";

/* Theme tab: shared image/video upload rows (icons, cursors, backgrounds) */

/* 
    THEME TAB: shared image/video upload rows
    Used by Cursors, Icons, Board background and App background.
    Uploads live in IndexedDB as "img:<id>". Rows are built in Boot.
*/
const ASSETS = [
    // icons
    { id: 'face-default', label: 'Face: normal',                     v: '--ic-face-default', def: 'assets/face-default.png' },
    { id: 'face-oh',      label: 'Face: surprised (while pressing)', v: '--ic-face-oh',      def: 'assets/face-oh.png' },
    { id: 'face-win',     label: 'Face: win',                        v: '--ic-face-win',     def: 'assets/face-win.png' },
    { id: 'face-die',     label: 'Face: lose',                       v: '--ic-face-die',     def: 'assets/face-die.png' },
    { id: 'mute-on',      label: 'Sound button: on',                 v: '--ic-mute-on',      def: 'assets/speaker-default.png' },
    { id: 'mute-off',     label: 'Sound button: off',                v: '--ic-mute-off',     def: 'assets/speaker-mute.png' },
    { id: 'settings',     label: 'Settings button',                  v: '--ic-settings',     def: 'assets/settings.png' },
    { id: 'flag-icon',    label: 'Flag mode button icon',            img: '#flagmode .btn-ico', def: 'assets/flag-icon.png' },
    { id: 'flag-cell',    label: 'Flag on the board',                v: '--ic-flag-cell',    def: 'assets/flag-cell.png' },
    // cursors
    { id: 'cur-normal', label: 'Cursor: normal',                                cursor: true, key: 'normal', def: 'assets/cursor-normal.png' },
    { id: 'cur-select', label: 'Cursor: select (left click held)',              cursor: true, key: 'select', def: 'assets/cursor-select.png' },
    { id: 'cur-flag',   label: 'Cursor: flag (right click or flag mode)',       cursor: true, key: 'flag',   def: 'assets/cursor-flag.png' },
    { id: 'cur-hold',   label: 'Cursor: holding (dragging the grip bar)',       cursor: true, key: 'hold',   def: 'assets/cursor-hold.png', hot: 'c' },
    { id: 'cur-text',   label: 'Cursor: text and resize',                       cursor: true, key: 'text',   def: 'assets/cursor-text.png', hot: 'c' },
    // backgrounds
    { id: 'board-bg',     label: 'Board image or video',             bg: 'board', video: true, def: '' },
    { id: 'app-bg',       label: 'App image or video',               bg: 'app',   video: true, def: '' }
];
const ASSET = Object.fromEntries(ASSETS.map(a => [a.id, a]));
const MAX_VIDEO = 64 * 1024 * 1024;
const assets = {}; // id -> { url, name, type } (uploads)
const arows = {};
const imgMsg = $('#img-msg'), curMsg = $('#cur-msg');
const msgEl = a => a.cursor ? curMsg : imgMsg;
function applyAsset(a) {
    const c = assets[a.id], st = root.style;
    const isVid = !!c && c.type === 'video';
    if (a.cursor) {
        applyCursor(a);
    } else if (a.bg === 'board') {
        if (c && !isVid) {
            st.setProperty('--board-img', 'url("' + c.url + '")');
            board.dataset.img = '';
        } else {
            st.removeProperty('--board-img');
            delete board.dataset.img;
        }
        if (isVid) {
            board.dataset.vid = '';
            setVideo(bv, c.url);
        } else {
            delete board.dataset.vid;
            clearVideo(bv);
        }
        $('#board-vid-opt').hidden = !isVid;
    } else if (a.bg === 'app') {
        $('#appbg').hidden = !c;
        if (c && !isVid) st.setProperty('--app-img', 'url("' + c.url + '")');
        else st.removeProperty('--app-img');
        if (isVid) setVideo(av, c.url);
        else clearVideo(av);
        $('#app-vid-opt').hidden = !isVid;
    } else if (a.img) {
        $(a.img).src = c ? c.url : a.def;
    } else if (c) {
        st.setProperty(a.v, 'url("' + c.url + '")');
    } else {
        st.removeProperty(a.v);   // the CSS fallback (default file in /assets) takes over
    }
    if (a.bg) applyVideos();
    const r = arows[a.id], u = c && !isVid ? c.url : a.def;
    r.name.textContent = c ? c.name : 'Default';
    r.name.title = c ? c.name : '';
    r.reset.disabled = !c;
    r.thumb.style.backgroundImage = u ? 'url("' + u + '")' : '';
    r.thumb.classList.toggle('is-video', isVid);   // videos get a play marker
}
function setAsset(a, blob, name) {
    if (assets[a.id]) URL.revokeObjectURL(assets[a.id].url);
    assets[a.id] = { 
        url: URL.createObjectURL(blob), name, type: blob.type.startsWith('video/') ? 
        'video' : 'image' 
    };
    applyAsset(a);
}
function resetAsset(a) {
    const c = assets[a.id];
    if (!c) return;
    URL.revokeObjectURL(c.url);
    delete assets[a.id];
    applyAsset(a);
    idb.del('img:' + a.id).catch(() => {});
}
function addAssetRow(a) {
    const el = document.createElement('div');
    el.className = 'snd';
    el.innerHTML =
        '<div class="snd-top"><span class="snd-label"></span><span class="snd-name"></span></div>' +
        '<div class="snd-btns">' +
        '<div class="thumb" role="img" aria-hidden="true"></div>' +
        '<button type="button" class="small up">Upload</button>' +
        '<button type="button" class="small rst">Reset</button>' +
        '</div>' +
        '<input type="file" accept="' + (a.video ? 'image/*,video/*' : 'image/*') + '" tabindex="-1">';
    const file = el.querySelector('input');
    el.querySelector('.snd-label').textContent = a.label;
    file.setAttribute('aria-label', 'Upload image for ' + a.label);
    arows[a.id] = { 
        name: el.querySelector('.snd-name'), reset: el.querySelector('.rst'), 
        thumb: el.querySelector('.thumb') 
    };
    if (a.cursor) { // cursors also get a hotspot and a scale control
        const hl = document.createElement('label');
        hl.className = 'hot';
        hl.innerHTML = 'Hotspot <select><option value="tl">Top-left</option><option value="c">Center</option></select>';
        const sel = hl.querySelector('select');
        sel.value = S.curHot[a.id];
        sel.onchange = () => {
            S.curHot[a.id] = sel.value;
            applyCursor(a);
            save();
            sfx('ui');
        };
        hotSel[a.id] = sel;
        el.insertBefore(hl, file);
        const sl = document.createElement('label');
        sl.className = 'hot';
        sl.innerHTML = 'Scale <input type="range" min="50" max="200" step="5"><output></output>';
        const sin = sl.querySelector('input'), sout = sl.querySelector('output');
        sin.value = S.curScale[a.id];
        sout.textContent = S.curScale[a.id] + '%';
        sin.oninput = () => { 
            S.curScale[a.id] = +sin.value;
            sout.textContent = sin.value + '%';
            curImg[a.key].style.setProperty('--k', sin.value / 100);
            save();
        };
        scaleSel[a.id] = { sin, sout };
        el.insertBefore(sl, file);
    }
    el.querySelector('.up').onclick = () => file.click();
    file.onchange = () => {
        const f = file.files[0];
        file.value = '';
        if (!f) return;
        const isVid = f.type.startsWith('video/');
        if (!f.type.startsWith('image/') && !(a.video && isVid)) {
            imgMsg.textContent = f.name +
                (a.video ? ' is not an image or video file.' : ' is not an image file.');
            return;
        }
        if (f.size > (isVid ? MAX_VIDEO : MAX_UPLOAD)) {
            imgMsg.textContent = f.name + ' is larger than ' + (isVid ? '64' : '8') + ' MB.';
            return;
        }
        setAsset(a, f, f.name);
        msgEl(a).textContent = a.label + ': using ' + f.name + '.';
        idb.put('img:' + a.id, { blob: f, name: f.name }).catch(() => {
            msgEl(a).textContent = a.label + ': using ' + f.name + 
                ', but it could not be saved and will reset when you reload.';
        });
    };
    el.querySelector('.rst').onclick = () => {
        resetAsset(a);
        msgEl(a).textContent = a.label + ': back to the default.';
        sfx('ui');
    };

    $(a.bg ? '#assets-' + a.bg : a.cursor ? '#assets-cursor' : '#assets').appendChild(el);
    applyAsset(a);
}
