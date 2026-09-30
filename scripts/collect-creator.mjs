// Estatísticas de Zed mid das contas do criador (autorizadas por ele), por inimigo.
// Contas em data/revy.json -> "accounts" (Riot ID, ex.: "revy#ana"). Resultado: data/creator-stats.json.
// Uso: node scripts/collect-creator.mjs [--days 30]
import fs from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  /* usa a variável de ambiente */
}
const KEY = process.env.RIOT_API_KEY;
if (!KEY) {
  console.error("Falta RIOT_API_KEY (coloque no .env).");
  process.exit(1);
}
const i = process.argv.indexOf("--days");
const DAYS = i > -1 ? Number(process.argv[i + 1]) : 30;
const CHAMP_KEY = 238; // Zed
const REGION = "americas"; // contas do BR

const ROOT = path.resolve(import.meta.dirname, "..");
const revy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "revy.json"), "utf8"));
const accounts = revy.accounts || [];
if (!accounts.length) {
  console.error('Nenhuma conta em data/revy.json ("accounts").');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function riot(pathname) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(`https://${REGION}.api.riotgames.com${pathname}`, { headers: { "X-Riot-Token": KEY } });
    if (r.status === 429 || r.status >= 500) {
      await sleep((Number(r.headers.get("retry-after")) || 5) * 1000);
      continue;
    }
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) throw new Error(`Chave recusada (${r.status}): renove no .env.`);
    if (!r.ok) throw new Error(`${r.status} ${pathname}`);
    await sleep(1300); // bem abaixo do limite da chave de desenvolvimento
    return r.json();
  }
  return null;
}

// Dados estáticos em pt-BR (mesma lógica do collect-stats.mjs)
const DD = "https://ddragon.leagueoflegends.com";
const version = (await (await fetch(`${DD}/api/versions.json`)).json())[0];
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

const since = Math.floor((Date.now() - DAYS * 86_400_000) / 1000);
const records = [];
for (const riotId of accounts) {
  const [name, tag] = riotId.split("#");
  const acc = await riot(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  if (!acc) {
    console.warn(`Conta não encontrada: ${riotId}`);
    continue;
  }
  const ids = (await riot(`/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?queue=420&startTime=${since}&count=100`)) || [];
  let found = 0;
  for (const id of ids) {
    const m = await riot(`/lol/match/v5/matches/${id}`);
    // (a timeline só é baixada se a partida for de Zed mid)
    const me = m?.info?.participants.find((p) => p.puuid === acc.puuid);
    if (!me || me.championId !== CHAMP_KEY || me.teamPosition !== "MIDDLE") continue;
    const enemy = m.info.participants.find((p) => p.teamId !== me.teamId && p.teamPosition === "MIDDLE");
    if (!enemy) continue;
    const inv = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].map(String);
    records.push({
      enemy: champByKey[enemy.championId] || String(enemy.championId),
      win: me.win ? 1 : 0,
      keystone: me.perks.styles[0].selections[0].perk,
      secondary: me.perks.styles[1].style,
      spells: [me.summoner1Id, me.summoner2Id].sort((a, b) => a - b),
      items: inv.filter(isLegendary),
      boots: inv.find(isBoots) || null,
      page: [...me.perks.styles[0].selections, ...me.perks.styles[1].selections].map((s) => s.perk),
      shards: [me.perks.statPerks.offense, me.perks.statPerks.flex, me.perks.statPerks.defense],
      order: purchaseOrder(await riot(`/lol/match/v5/matches/${id}/timeline`), me.participantId),
    });
    found++;
  }
  console.log(`${riotId}: ${ids.length} ranqueadas, ${found} de Zed mid`);
}

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
  page: consensusPage(list),
  order: consensusOrder(list),
});

const byEnemy = {};
records.forEach((r) => (byEnemy[r.enemy] ||= []).push(r));
const out = {
  accounts: revy.showAccountNames ? accounts : [],
  days: DAYS,
  generatedAt: new Date().toISOString(),
  overall: summarize(records),
  vs: Object.fromEntries(Object.entries(byEnemy).map(([k, list]) => [k, summarize(list)])),
};
fs.writeFileSync(path.join(ROOT, "data", "creator-stats.json"), JSON.stringify(out, null, 1));
console.log(`OK: ${records.length} partidas de Zed mid -> data/creator-stats.json`);
