// Monta data/matchups.json juntando:
//  - data/stats.json  (coleta própria na API da Riot: vitórias, runas, feitiços, itens por inimigo)
//  - data/revy.json   (conteúdo do Revy: dificuldade, resumo, setup, dicas e vídeos; tudo opcional)
// O que o Revy preencher tem prioridade; o resto vem dos dados.
// Uso: node scripts/build-matchups.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const stats = read("stats.json");
const revy = read("revy.json");

const MIN_GAMES = Number(process.argv[process.argv.indexOf("--min") + 1]) || 8; // abaixo disso o campeão só entra se o Revy escreveu sobre ele
const PRIOR = 20; // "partidas fantasmas" na média geral: evita que 3 vitórias seguidas virem "ultra fácil"

const DD = "https://ddragon.leagueoflegends.com";
const champs = (await (await fetch(`${DD}/cdn/${stats.version}/data/en_US/champion.json`)).json()).data;
const byName = Object.fromEntries(Object.values(champs).map((c) => [c.name, c]));
const CLASS = { Mage: "Mago", Assassin: "Assassino", Fighter: "Lutador", Marksman: "Atirador", Support: "Suporte", Tank: "Tanque" };

const overall = stats.overall.wins / stats.overall.games;
// Taxa de vitória do Zed contra o inimigo, puxada pra média geral quando a amostra é pequena.
const smoothed = (s) => (s.wins + PRIOR * overall) / (s.games + PRIOR);
// Dificuldade pela vitória do Zed, relativa à média dele (o Zed perder 50/50 é "mediano", não "difícil").
function difficulty(s) {
  const d = smoothed(s) - overall;
  if (d >= 0.05) return 1;
  if (d >= 0.02) return 2;
  if (d > -0.02) return 3;
  if (d > -0.05) return 4;
  return 5;
}
const pct = (n, d) => Math.round((n / d) * 100);

const names = new Set([
  ...Object.entries(stats.vs)
    .filter(([, s]) => s.games >= MIN_GAMES)
    .map(([id]) => Object.values(champs).find((c) => c.id === id)?.name)
    .filter(Boolean),
  ...Object.keys(revy.matchups),
]);

const matchups = [...names]
  .map((name) => {
    const c = byName[name];
    if (!c) {
      console.warn(`Campeão não encontrado no Data Dragon: "${name}" (confira o nome em data/revy.json)`);
      return null;
    }
    const s = stats.vs[c.id];
    const r = revy.matchups[name] || {};
    const hasGuide = !!(r.laneTips?.length || r.summary || r.setup);
    const autoSetup = s && {
      Runa: s.keystones[0]?.name,
      Feitiços: s.spells[0]?.name,
      Build: s.items.slice(0, 3).map((i) => i.name).join(" → "),
    };
    return {
      champion: name,
      class: CLASS[c.tags[0]] || c.tags[0],
      difficulty: r.difficulty || (s ? difficulty(s) : 3),
      difficultySource: r.difficulty ? "revy" : "dados",
      summary:
        r.summary ||
        (s
          ? `Zed venceu ${pct(s.wins, s.games)}% de ${s.games} partidas contra ${name} no patch ${stats.patch} (média geral do Zed: ${pct(stats.overall.wins, stats.overall.games)}%).`
          : "Sem partidas suficientes neste patch."),
      setup: r.setup || autoSetup || null,
      setupSource: r.setup ? "revy" : "dados",
      laneTips: r.laneTips || [],
      onlyTierList: !hasGuide, // mantém o nome do campo do site base: true = ainda sem dicas do Revy
      sources: r.sources || [],
      games: s?.games || 0,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.champion.localeCompare(b.champion));

const out = {
  difficultyScale: { 1: "Ultra fácil", 2: "Fácil", 3: "Mediano", 4: "Difícil", 5: "Muito difícil" },
  patch: stats.patch,
  fundamentos: revy.fundamentos || [],
  matchups,
};
fs.writeFileSync(path.join(ROOT, "data", "matchups.json"), JSON.stringify(out, null, 2));
const guided = matchups.filter((m) => !m.onlyTierList).length;
console.log(`OK: ${matchups.length} confrontos (${guided} com dicas do Revy) -> data/matchups.json`);
