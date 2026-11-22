// Builds endless-mode dock maps off the main thread (mapgen.js), so generation never costs a frame during the ride.
import { generateDock, learn } from './mapgen.js';

let rules = null, corpusKey = '';
self.onmessage = (e) => {
  const { id, base, corpus, seed } = e.data;
  const key = corpus.length + ':' + corpus[0]?.[0];
  if (!rules || key !== corpusKey) { rules = learn(corpus); corpusKey = key; }
  self.postMessage({ id, ...generateDock(base, corpus, seed, { rules }) });
};
