"use strict";

/* Runs the slow part of dealing a board (engine.js place) off the main thread. See deal.js. */
importScripts('engine.js'); // engine.js has no DOM code, so it loads fine in a worker

onmessage = e => {
    const d = e.data;
    const g = newGame(d.rows, d.cols, d.mines, d.safety, d.seed, d.noGuess);
    placeRaw(g, d.first); // not place(): the worker has no use for the cache, and its arrays are transferred away below
    postMessage({ id: d.id, mine: g.mine, adj: g.adj, ng: g.ng }, [g.mine.buffer, g.adj.buffer]);
};
