"use strict";

/*
    FIRST-CLICK DEAL IN A WEB WORKER
    In no-guess mode the first click has to find a board a person can solve without guessing. On a big or
    dense board that search can take seconds on a phone, and while it runs on the main thread the page is frozen.
    For boards that may be slow, the search runs in scripts/deal-worker.js instead; the answer goes into the
    deal cache (engine.js), and then the normal click code runs again and finds it there instantly.

    Falls back to the old synchronous deal if workers are unavailable (file://, old browser, worker error).
*/
let dealing = false; // true while a worker deal is pending: other clicks are ignored for that moment
let dealWorker = null, dealBroken = false, dealId = 0, dealPending = null, dealMsgTimer = 0;
const DEAL_MSG = 'Dealing a no-guess board…';

// only the boards that can be slow: big, or dense. Small ones solve in a few ms, a worker round trip would cost more
const dealIsHeavy = g => g.noGuess && (g.n >= 400 || g.mines / g.n >= 0.17);

function getDealWorker() {
    if (dealBroken) return null;
    if (dealWorker) return dealWorker;
    try {
        dealWorker = new Worker('scripts/deal-worker.js');
        dealWorker.onmessage = e => onDealDone(e.data);
        dealWorker.onerror = () => dealFailed();
    } catch (err) {
        dealBroken = true;
        dealWorker = null;
    }
    return dealWorker;
}

// worker broke (blocked on file://, script missing...): never use it again and finish the pending click the old way
function dealFailed() {
    dealBroken = true;
    if (dealWorker) dealWorker.terminate();
    dealWorker = null;
    const p = dealPending;
    clearDealState();
    if (p && p.game === g) p.done();
}

function clearDealState() {
    dealPending = null;
    dealing = false;
    clearTimeout(dealMsgTimer);
    if ($('#msg').textContent === DEAL_MSG) $('#msg').textContent = '';
}

function onDealDone(m) {
    const p = dealPending;
    if (!p || m.id !== p.id) return; // answer of a game that was already thrown away
    dealCacheSet(p.key, m.mine, m.adj, m.ng);
    clearDealState();
    if (p.game === g) p.done(); // same game still on screen: repeat the click, it will find the layout in the cache
}

// returns true if the click is now waiting for the worker (the caller stops), false if it should go on right now
function dealInWorker(game, first, done) {
    if (!dealIsHeavy(game)) return false;
    const key = dealKey(game, first);
    if (dealCache.has(key)) return false;
    const w = getDealWorker();
    if (!w) return false;
    const id = ++dealId;
    dealPending = { id, key, game, done };
    dealing = true;
    dealMsgTimer = setTimeout(() => { $('#msg').textContent = DEAL_MSG; }, 150); // only if it takes a noticeable time
    w.postMessage({ id, rows: game.rows, cols: game.cols, mines: game.mines, safety: game.safety,
        seed: game.seed, noGuess: game.noGuess, first });
    return true;
}

// new game / new settings: forget the pending deal (its answer is ignored when it arrives)
function cancelDeal() {
    if (dealPending) clearDealState();
}

// get the worker ready while the page is idle, so the first click does not pay for starting it
addEventListener('load', () => {
    const warm = () => { if (S.noGuess) getDealWorker(); };
    window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 4000 }) : setTimeout(warm, 2000);
});
