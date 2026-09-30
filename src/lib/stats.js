// data/stats.json é gerado por scripts/collect-stats.mjs (API oficial da Riot). Opcional: sem ele, o bloco some.
const files = import.meta.glob("../../data/stats.json", { eager: true, import: "default" });
export const STATS = Object.values(files)[0] || null;
// data/creator-stats.json: partidas das contas do criador, autorizadas por ele (scripts/collect-creator.mjs).
const creatorFiles = import.meta.glob("../../data/creator-stats.json", { eager: true, import: "default" });
export const CREATOR_STATS = Object.values(creatorFiles)[0] || null;

export const MIN_SAMPLE = 15;
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

const PLATFORM_LABEL = { br1: "BR", kr: "KR", euw1: "EUW", na1: "NA", eun1: "EUNE", jp1: "JP", la1: "LAN", la2: "LAS", tr1: "TR" };
export const platformsLabel = (list = []) => list.map((p) => PLATFORM_LABEL[p] || p.toUpperCase()).join(", ");

// Nomes que a comunidade usa em inglês -> nome no client pt-BR, pra comparar com o setup do vídeo.
const ALIASES = { fantasma: ["ghost"], incendiar: ["ignite"], "invocar aery": ["aery"] };
export function mentions(text = "", name = "") {
  const t = text.toLowerCase();
  const n = name.toLowerCase();
  return t.includes(n) || (ALIASES[n] || []).some((a) => t.includes(a));
}
