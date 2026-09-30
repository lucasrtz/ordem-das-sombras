// Coleta estatísticas agregadas de Zed mid por inimigo, direto da API oficial da Riot.
// Uso: node scripts/collect-stats.mjs [--platforms br1,kr,euw1,na1] [--minutes 60] [--days 21] [--enrich] [--aggregate-only]
// --enrich: completa as partidas do cache com página de runas e ordem de compra (baixa a partida e a timeline de novo).
// --aggregate-only: só recalcula data/stats.json com o cache, sem chamar a API.
// Precisa de RIOT_API_KEY no .env. Resultado: data/stats.json (só agregados, nenhum jogador identificável).
// Pode ser interrompido e rodado de novo: o progresso fica em data/.cache/.
import fs from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  /* sem .env: usa a variável de ambiente */
}
const KEY = process.env.RIOT_API_KEY;
if (!KEY) {
  console.error("Falta RIOT_API_KEY (coloque no .env).");
  process.exit(1);
}

const arg = (name, def) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : def;
};
const REGION_OF = { br1: "americas", na1: "americas", la1: "americas", la2: "americas", kr: "asia", jp1: "asia", euw1: "europe", eun1: "europe", tr1: "europe" };
const PLATFORMS = arg("platforms", "br1,kr,euw1,na1").split(",");
const MAX_MS = Number(arg("minutes", 60)) * 60_000;
const DAYS = Number(arg("days", 21));
const ENRICH = process.argv.includes("--enrich");
const AGGREGATE_ONLY = process.argv.includes("--aggregate-only");
const CHAMP_KEY = 238; // Zed
const MIN_POINTS = 30_000; // maestria mínima pra considerar alguém jogador de Zed

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, "data", ".cache");
fs.mkdirSync(CACHE, { recursive: true });
const readJSON = (f, def) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8"));
  } catch {
    return def;
  }
};
const writeJSON = (f, v) => fs.writeFileSync(path.join(CACHE, f), JSON.stringify(v));

// ---------- limite de requisições (por host, como a Riot conta) ----------
const LIMITS = [
  [18, 1_000],
  [95, 120_000],
];
const hosts = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function slot(host) {
  let h = hosts.get(host);
  if (!h) hosts.set(host, (h = { times: [], chain: Promise.resolve() }));
  const run = h.chain.then(async () => {
    for (;;) {
      const now = Date.now();
      h.times = h.times.filter((t) => now - t < 120_000);
      const wait = Math.max(
        0,
        ...LIMITS.map(([n, win]) => {
          const inWin = h.times.filter((t) => now - t < win);
          return inWin.length >= n ? win - (now - inWin[inWin.length - n]) + 50 : 0;
        })
      );
      if (!wait) break;
      await sleep(wait);
    }
    h.times.push(Date.now());
  });
  h.chain = run;
  return run;
}

let requests = 0;
async function riot(host, pathname) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await slot(host);
    requests++;
    const r = await fetch(`https://${host}.api.riotgames.com${pathname}`, { headers: { "X-Riot-Token": KEY } });
    if (r.status === 429 || r.status >= 500) {
      await sleep((Number(r.headers.get("retry-after")) || 5) * 1000);
      continue;
    }
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) throw new Error(`Chave recusada (${r.status}). A chave de desenvolvimento expira em 24h: renove e atualize o .env.`);
    if (!r.ok) throw new Error(`${r.status} ${pathname}`);
    return r.json();
  }
  return null;
}

// ---------- dados estáticos (nomes em pt-BR) ----------
const DD = "https://ddragon.leagueoflegends.com";
const version = (await (await fetch(`${DD}/api/versions.json`)).json())[0];
const PATCH = version.split(".").slice(0, 2).join(".");
const dd = async (f) => (await fetch(`${DD}/cdn/${version}/data/pt_BR/${f}`)).json();
const [champs, runes, spells, items] = await Promise.all([dd("champion.json"), dd("runesReforged.json"), dd("summoner.json"), dd("item.json")]);
const champByKey = Object.fromEntries(Object.values(champs.data).map((c) => [c.key, c.id]));
const runeName = {};
runes.forEach((t) => {
  runeName[t.id] = t.name;
  t.slots.forEach((s) => s.runes.forEach((r) => (runeName[r.id] = r.name)));
});
const spellName = Object.fromEntries(Object.values(spells.data).map((s) => [s.key, s.name]));
const itemInfo = items.data;
const isBoots = (id) => itemInfo[id]?.tags?.includes("Boots") && (itemInfo[id]?.depth || 1) >= 2;
const isLegendary = (id) => {
  const it = itemInfo[id];
  return it && !it.into?.length && (it.gold?.total || 0) >= 2000 && !it.tags?.includes("Boots") && !it.tags?.includes("Consumable");
};

// ---------- coleta ----------
const matches = readJSON("matches.json", {}); // id -> registro | 0 (sem Zed mid)
const started = Date.now();
const timeLeft = () => MAX_MS - (Date.now() - started);
let saveTick = 0;
const save = (force) => {
  if (force || ++saveTick % 25 === 0) writeJSON("matches.json", matches);
};

function extract(m) {
  const info = m.info;
  if (info.queueId !== 420 || !info.gameVersion?.startsWith(PATCH + ".")) return 0;
  const me = info.participants.find((p) => p.championId === CHAMP_KEY && p.teamPosition === "MIDDLE");
  if (!me) return 0;
  const enemy = info.participants.find((p) => p.teamId !== me.teamId && p.teamPosition === "MIDDLE");
  if (!enemy) return 0;
  const inv = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].map(String);
  return {
    enemy: champByKey[enemy.championId] || String(enemy.championId),
    win: me.win ? 1 : 0,
    keystone: me.perks.styles[0].selections[0].perk,
    secondary: me.perks.styles[1].style,
    spells: [me.summoner1Id, me.summoner2Id].sort((a, b) => a - b),
    items: inv.filter(isLegendary),
    boots: inv.find(isBoots) || null,
    minutes: Math.round(info.gameDuration / 60),
    pid: me.participantId,
    page: [...me.perks.styles[0].selections, ...me.perks.styles[1].selections].map((s) => s.perk),
    shards: [me.perks.statPerks.offense, me.perks.statPerks.flex, me.perks.statPerks.defense],
  };
}

// Ordem real de compra (timeline): botas tier 2 e os 3 primeiros itens lendários, na ordem em que foram comprados.
function purchaseOrder(timeline, pid) {
  const bought = [];
  for (const frame of timeline?.info?.frames || []) {
    for (const e of frame.events || []) {
      if (e.participantId !== pid) continue;
      if (e.type === "ITEM_PURCHASED") bought.push(String(e.itemId));
      if (e.type === "ITEM_UNDO" && e.beforeId) {
        const i = bought.lastIndexOf(String(e.beforeId));
        if (i > -1) bought.splice(i, 1);
      }
    }
  }
  const order = [];
  let legendaries = 0;
  let boots = false;
  for (const id of bought) {
    if (isLegendary(id) && legendaries < 3 && !order.includes(id)) {
      order.push(id);
      legendaries++;
    } else if (isBoots(id) && !boots) {
      order.push(id);
      boots = true;
    }
    if (legendaries === 3 && boots) break;
  }
  return order;
}
const regionOfMatch = (id) => REGION_OF[id.split("_")[0].toLowerCase()];
async function addDetails(id, record, m) {
  if (!record) return record;
  const tl = await riot(regionOfMatch(id), `/lol/match/v5/matches/${id}/timeline`);
  const full = { ...record, ...((m && extract(m)) || {}) };
  return { ...full, order: tl ? purchaseOrder(tl, full.pid) : [] };
}

async function collectPlatform(platform) {
  const region = REGION_OF[platform];
  const mastery = readJSON(`mastery-${platform}.json`, {});
  const seenIds = readJSON(`seen-${platform}.json`, {});
  let players = readJSON(`players-${platform}.json`, null);
  if (!players || Date.now() - players.at > 3 * 86_400_000) {
    const lists = await Promise.all(
      ["challengerleagues", "grandmasterleagues", "masterleagues"].map((l) => riot(platform, `/lol/league/v4/${l}/by-queue/RANKED_SOLO_5x5`))
    );
    const list = lists.flatMap((l) => l?.entries || []).sort((a, b) => b.leaguePoints - a.leaguePoints);
    players = { at: Date.now(), puuids: list.map((e) => e.puuid).filter(Boolean) };
    writeJSON(`players-${platform}.json`, players);
  }
  const since = Math.floor((Date.now() - DAYS * 86_400_000) / 1000);

  // Duas filas em paralelo: o scanner usa o host da plataforma (maestria),
  // o fetcher usa o host regional (partidas). Assim os dois limites trabalham ao mesmo tempo.
  const queue = players.puuids.filter((p) => mastery[p] === 1);
  let scanning = true;

  const scanner = (async () => {
    let checked = 0;
    for (const puuid of players.puuids) {
      if (timeLeft() <= 0) break;
      if (puuid in mastery) continue;
      const m = await riot(platform, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/by-champion/${CHAMP_KEY}`);
      mastery[puuid] = m && m.championPoints >= MIN_POINTS && m.lastPlayTime / 1000 >= since ? 1 : 0;
      if (mastery[puuid]) queue.push(puuid);
      if (++checked % 50 === 0) writeJSON(`mastery-${platform}.json`, mastery);
    }
    scanning = false;
  })();

  const fetcher = (async () => {
    while (timeLeft() > 0) {
      const puuid = queue.shift();
      if (!puuid) {
        if (!scanning) break;
        await sleep(500);
        continue;
      }
      const ids = (await riot(region, `/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&startTime=${since}&count=40`)) || [];
      for (const id of ids) {
        if (id in matches || timeLeft() <= 0) continue;
        const m = await riot(region, `/lol/match/v5/matches/${id}`);
        matches[id] = m ? await addDetails(id, extract(m), m) : 0;
        save();
      }
      seenIds[puuid] = Date.now();
    }
  })();

  await Promise.all([scanner, fetcher]);
  writeJSON(`mastery-${platform}.json`, mastery);
  writeJSON(`seen-${platform}.json`, seenIds);
}

function log() {
  const games = Object.values(matches).filter(Boolean).length;
  const min = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`[${min} min] ${requests} requisições · ${games} partidas de Zed mid no patch ${PATCH}`);
}
const ticker = setInterval(log, 60_000);

if (ENRICH) {
  // Partidas do cache sem página de runas/ordem de compra: baixa de novo, em paralelo por região.
  const pending = Object.entries(matches).filter(([, r]) => r && (!r.page || !r.order));
  console.log(`Completando ${pending.length} partidas com runas e ordem de compra...`);
  const byRegion = {};
  pending.forEach(([id, r]) => (byRegion[regionOfMatch(id)] ||= []).push([id, r]));
  let done = 0;
  try {
    await Promise.all(
      Object.entries(byRegion).map(async ([region, list]) => {
        for (const [id, r] of list) {
          const m = await riot(region, `/lol/match/v5/matches/${id}`);
          matches[id] = await addDetails(id, r, m);
          if (++done % 50 === 0) console.log(`  ${done}/${pending.length}`);
          save();
        }
      })
    );
  } finally {
    save(true);
  }
} else if (!AGGREGATE_ONLY) {
  try {
    await Promise.all(PLATFORMS.map((p) => collectPlatform(p).catch((e) => console.error(`${p}: ${e.message}`))));
  } finally {
    save(true);
  }
}
clearInterval(ticker);

// ---------- agregação ----------
const records = Object.values(matches).filter(Boolean);
const top = (list, keyOf, nameOf, limit) => {
  const acc = new Map();
  list.forEach((r) =>
    [].concat(keyOf(r)).forEach((k) => {
      if (k == null) return;
      const a = acc.get(k) || { games: 0, wins: 0 };
      a.games++;
      a.wins += r.win;
      acc.set(k, a);
    })
  );
  return [...acc.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, limit)
    .map(([k, a]) => ({ key: String(k), name: nameOf(k), games: a.games, wins: a.wins }));
};
// Linha (0 = pedra angular) e árvore de cada runa, pra montar a página de consenso.
const perkRow = {};
runes.forEach((tree) => tree.slots.forEach((s, row) => s.runes.forEach((r) => (perkRow[r.id] = { row, tree: tree.id }))));
const mode = (values) => {
  const c = new Map();
  values.forEach((v) => v != null && c.set(v, (c.get(v) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};
function consensusPage(list) {
  const withPage = list.filter((r) => r.page);
  const keystone = mode(withPage.map((r) => r.keystone));
  const base = withPage.filter((r) => r.keystone === keystone);
  if (!base.length) return null;
  const primary = [keystone, 1, 2, 3].map((slot, i) => (i === 0 ? slot : mode(base.map((r) => r.page[i]))));
  const secTree = mode(base.map((r) => r.secondary));
  const secPicks = base.filter((r) => r.secondary === secTree).flatMap((r) => r.page.slice(4, 6));
  const first = mode(secPicks);
  const second = mode(secPicks.filter((p) => perkRow[p]?.row !== perkRow[first]?.row));
  const shards = [0, 1, 2].map((i) => mode(base.map((r) => r.shards?.[i])));
  return { runes: [...primary, first, second].filter(Boolean), shards, keystoneGames: base.length, games: withPage.length };
}
function consensusOrder(list) {
  let pool = list.filter((r) => r.order?.length >= 3);
  const total = pool.length;
  if (!total) return null;
  const legendaries = (r) => r.order.filter((id) => !isBoots(id));
  const seq = [];
  for (let i = 0; i < 3; i++) {
    const pick = mode(pool.map((r) => legendaries(r)[i]).filter((id) => id && !seq.includes(id)));
    if (!pick) break;
    seq.push(pick);
    const narrowed = pool.filter((r) => legendaries(r)[i] === pick);
    if (narrowed.length >= 3) pool = narrowed; // só afunila enquanto houver amostra
  }
  const all = list.filter((r) => r.order?.length >= 3);
  const boots = mode(all.map((r) => r.order.find((id) => isBoots(id))));
  const bootsAt = mode(all.map((r) => r.order.filter((id) => !isBoots(id) || id === boots).indexOf(boots)).filter((i) => i >= 0));
  const items = [...seq];
  if (boots != null) items.splice(Math.min(bootsAt ?? 1, items.length), 0, boots);
  const firstTwo = all.filter((r) => legendaries(r)[0] === seq[0] && legendaries(r)[1] === seq[1]);
  return { items, firstTwoGames: firstTwo.length, firstTwoWins: firstTwo.reduce((s, r) => s + r.win, 0), games: all.length };
}
const summarize = (list) => ({
  games: list.length,
  wins: list.reduce((s, r) => s + r.win, 0),
  keystones: top(list, (r) => r.keystone, (k) => runeName[k], 3),
  secondary: top(list, (r) => r.secondary, (k) => runeName[k], 2),
  spells: top(list, (r) => r.spells.join("+"), (k) => k.split("+").map((s) => spellName[s]).join(" + "), 3),
  items: top(list, (r) => r.items, (k) => itemInfo[k]?.name, 6),
  boots: top(list, (r) => r.boots, (k) => itemInfo[k]?.name, 3),
  // Página de runas e ordem de compra "de consenso": a escolha mais comum de cada linha/posição.
  page: consensusPage(list),
  order: consensusOrder(list),
});

const byEnemy = {};
records.forEach((r) => (byEnemy[r.enemy] ||= []).push(r));
const out = {
  patch: PATCH,
  version,
  generatedAt: new Date().toISOString(),
  platforms: PLATFORMS,
  tier: "Mestre+",
  days: DAYS,
  overall: summarize(records),
  vs: Object.fromEntries(Object.entries(byEnemy).map(([k, list]) => [k, summarize(list)])),
};
fs.writeFileSync(path.join(ROOT, "data", "stats.json"), JSON.stringify(out, null, 1));
console.log(`\nOK: ${records.length} partidas, ${Object.keys(byEnemy).length} inimigos -> data/stats.json`);
