// Recount section headers on the Trello board: renames "HOMEPAGE | 8" style
// counts on every ALL-CAPS header card, per list. Rename-only (no sorting,
// no creation) — safe to run on a schedule or webhook.
const KEY = process.env.TRELLO_KEY, TOKEN = process.env.TRELLO_TOKEN, BOARD = process.env.BOARD_ID;
const AUTH = `key=${KEY}&token=${TOKEN}`;
const ORDER = ['green','yellow','purple','orange','red','blue','sky','lime','pink','black'];
const base = c => (c || '').replace(/_(light|dark)$/, '');
const rank = c => { const i = ORDER.indexOf(base(c)); return i < 0 ? ORDER.length : i; };
const strip = n => (n || '').trim()
  .replace(/\s*\|\s*\d+$/, '')
  .replace(/\s\(\d+\s+Stor(?:y|ies)\)$/, '')
  .replace(/\s·\s\d+$/, '');
const isHeader = c => { const n = strip(c.name); return n.length > 0 && n.length <= 40 && n === n.toUpperCase() && /[A-Z]/.test(n); };
const prim = c => {
  const l = (c.labels || []).slice().sort((a, b) =>
    rank(a.color) - rank(b.color) ||
    (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
  return l[0] || null;
};
(async () => {
  const cards = await (await fetch(`https://api.trello.com/1/boards/${BOARD}/cards?fields=name,idList,labels&${AUTH}`)).json();
  const byList = {};
  for (const c of cards) (byList[c.idList] ??= []).push(c);
  for (const list of Object.values(byList)) {
    for (const h of list.filter(isHeader)) {
      const lbl = prim(h);
      const n = list.filter(c => {
        if (isHeader(c)) return false;
        const cl = prim(c);
        return lbl
          ? cl && base(cl.color) === base(lbl.color) && (cl.name || '').toLowerCase() === (lbl.name || '').toLowerCase()
          : !cl;
      }).length;
      const name = `${strip(h.name)}  |  ${n}`;
      if (name !== h.name) {
        await fetch(`https://api.trello.com/1/cards/${h.id}?name=${encodeURIComponent(name)}&${AUTH}`, { method: 'PUT' });
        console.log('renamed:', name);
      }
    }
  }
})().catch(e => { console.error(e); process.exit(1); });

