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
const summarize = (list) => ({
  games: list.length,
  wins: list.reduce((s, r) => s + r.win, 0),
  keystones: top(list, (r) => r.keystone, (k) => runeName[k], 3),
  secondary: top(list, (r) => r.secondary, (k) => runeName[k], 2),
  spells: top(list, (r) => r.spells.join("+"), (k) => k.split("+").map((s) => spellName[s]).join(" + "), 3),
  items: top(list, (r) => r.items, (k) => itemInfo[k]?.name, 6),
  boots: top(list, (r) => r.boots, (k) => itemInfo[k]?.name, 3),
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
