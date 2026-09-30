// Dados de Arena de fontes oficiais/públicas: augments do CommunityDragon, itens do Data Dragon.
// A ESCOLHA do que o Zed usa fica em data/arena-zed.json (nomes em pt-BR).
import { norm } from "./ddragon.js";

const CD = "https://raw.communitydragon.org/latest";
const DD = "https://ddragon.leagueoflegends.com";

export const RARITY = {
  prismatic: { label: "Prismáticos", rarity: 2 },
  gold: { label: "Ouro", rarity: 1 },
  silver: { label: "Prata", rarity: 0 },
};

const KEYWORDS = { Item_Keyword_OnHit: "Ao acertar um ataque," };

const fmt = (n) => String(Math.round(n * 100) / 100).replace(".", ",");

// Troca @Var@ / @Var*100@ pelos valores de dataValues (faixa "min–max" quando varia).
function fillVars(text, values = {}) {
  return text.replace(/@([A-Za-z0-9_]+)(\*100)?@/g, (_, name, pct) => {
    const arr = values[name];
    if (!arr || !arr.length) return "?";
    const nums = arr.map((v) => (pct ? v * 100 : v));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  });
}

function cleanText(html) {
  return html
    .replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (_, k) => KEYWORDS[k] || "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\s?%i:[A-Za-z]+%/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function augmentText(a) {
  return cleanText(fillVars(a.desc || a.tooltip || "", a.dataValues));
}
export const augmentIcon = (a) => `${CD}/game/${(a.iconLarge || a.iconSmall || "").toLowerCase()}`;

// Resumo do item: atributos (<stats>) e nomes das passivas.
export function itemText(it) {
  const d = it.description || "";
  const stats = (d.match(/<stats>([\s\S]*?)<\/stats>/) || [])[1];
  const passives = [...d.matchAll(/<passive>([\s\S]*?)<\/passive>/g)].map((m) => cleanText(m[1]));
  const statsLine = stats ? cleanText(stats).split("\n").filter(Boolean).join(" · ") : cleanText(it.plaintext || "");
  return { stats: statsLine, passives: [...new Set(passives)] };
}
export const itemIcon = (version, id) => `${DD}/cdn/${version}/img/item/${id}.png`;

let cache = null;
export function loadArena(version) {
  if (cache) return cache;
  cache = Promise.all([
    fetch(`${CD}/cdragon/arena/pt_br.json`).then((r) => r.json()),
    fetch(`${DD}/cdn/${version}/data/pt_BR/item.json`).then((r) => r.json()),
  ])
    .then(([arena, items]) => {
      const augments = new Map();
      arena.augments.forEach((a) => {
        augments.set(norm(a.name), a);
        augments.set(norm(a.apiName), a);
      });
      // Mesmo nome existe em várias versões (SR, Arena, ...): prefere a de Arena (mapa 30).
      const itemMap = new Map();
      Object.entries(items.data).forEach(([id, it]) => {
        const key = norm(it.name);
        const prev = itemMap.get(key);
        if (!prev || (it.maps?.["30"] && !prev.maps?.["30"])) itemMap.set(key, { ...it, id });
        itemMap.set(id, { ...it, id });
      });
      return { augments, items: itemMap };
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}
