// Runas e itens do Summoner's Rift (Data Dragon, pt-BR) para mostrar ícones,
// e reconhecimento dos nomes que aparecem nos textos do Guaxi ("Rabadon", "Rocketbelt"...).
import { useEffect, useState } from "react";
import { norm } from "./ddragon.js";

const DD = "https://ddragon.leagueoflegends.com";
const CD = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods";

export const runeIcon = (icon) => `${DD}/cdn/img/${icon}`;
export const itemIconUrl = (version, id) => `${DD}/cdn/${version}/img/item/${id}.png`;

// Fragmentos de atributo (não estão no Data Dragon; ícones do CommunityDragon).
export const SHARDS = {
  5008: { name: "Força Adaptativa", icon: `${CD}/statmodsadaptiveforceicon.png` },
  5005: { name: "Velocidade de Ataque", icon: `${CD}/statmodsattackspeedicon.png` },
  5007: { name: "Aceleração de Habilidade", icon: `${CD}/statmodscdrscalingicon.png` },
  5010: { name: "Velocidade de Movimento", icon: `${CD}/statmodsmovementspeedicon.png` },
  5001: { name: "Escalamento de Vida", icon: `${CD}/statmodshealthplusicon.png` },
  5011: { name: "Vida", icon: `${CD}/statmodshealthscalingicon.png` },
  5013: { name: "Tenacidade e Resistência a Lentidão", icon: `${CD}/statmodstenacityicon.png` },
};
export const SHARD_ROWS = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
];

// Apelidos usados nos textos -> nome oficial no client pt-BR.
const ITEM_ALIASES = {
  rabadon: "Capuz da Morte de Rabadon",
  zhonya: "Ampulheta de Zhonya",
  rocketbelt: "Explocinturão Hextec",
  protobelt: "Explocinturão Hextec",
  lacre: "Lacre Sombrio",
  apice: "Ápice da Tempestade",
  "cajado do vazio": "Cajado do Vazio",
  banshee: "Véu da Banshee",
  mejai: "Ladrão de Almas de Mejai",
  liandry: "Tormento de Liandry",
  codex: "Códex Demoníaco",
  mercurio: "Passos de Mercúrio",
  "bota cdr": "Botas Ionianas da Lucidez",
  ionianas: "Botas Ionianas da Lucidez",
  "botas da rapidez": "Botas da Rapidez",
  "bota de velocidade": "Botas da Rapidez",
  "bota que pinica": "Botas da Rapidez",
  "sapatos do feiticeiro": "Sapatos do Feiticeiro",
  "anel de doran": "Anel de Doran",
  criafendas: "Criafendas",
  "impeto cosmico": "Ímpeto Cósmico",
  "capitulo perdido": "Capítulo Perdido",
};
const RUNE_ALIASES = { aery: "Invocar Aery" };
const SPELL_ALIASES = { ghost: "Fantasma", ignite: "Incendiar", tp: "Teleporte", exhaust: "Exaustão" };
export const spellIconUrl = (version, id) => `${DD}/cdn/${version}/img/spell/${id}.png`;

const plain = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

let cache = null;
function load(version) {
  if (cache) return cache;
  cache = Promise.all([
    fetch(`${DD}/cdn/${version}/data/pt_BR/runesReforged.json`).then((r) => r.json()),
    fetch(`${DD}/cdn/${version}/data/pt_BR/item.json`).then((r) => r.json()),
    fetch(`${DD}/cdn/${version}/data/pt_BR/summoner.json`).then((r) => r.json()),
  ])
    .then(([trees, items, summoners]) => {
      const spellByName = new Map();
      const spellByKey = new Map();
      Object.values(summoners.data).forEach((s) => {
        if (!s.modes?.includes("CLASSIC")) return;
        const sp = { id: s.id, key: s.key, name: s.name };
        spellByName.set(plain(s.name), sp);
        spellByKey.set(s.key, sp);
      });
      const runes = new Map(); // id -> { id, name, icon, tree }
      const runeByName = new Map();
      trees.forEach((t) => {
        const tree = { id: t.id, name: t.name, icon: t.icon, slots: t.slots.map((s) => s.runes.map((r) => r.id)) };
        runes.set(t.id, { id: t.id, name: t.name, icon: t.icon, isTree: true, tree });
        t.slots.forEach((s) =>
          s.runes.forEach((r) => {
            const rune = { id: r.id, name: r.name, icon: r.icon, tree };
            runes.set(r.id, rune);
            runeByName.set(plain(r.name), rune);
          })
        );
      });
      const itemByName = new Map();
      const itemById = new Map(Object.entries(items.data).map(([id, it]) => [id, it.name]));
      Object.entries(items.data).forEach(([id, it]) => {
        if (!it.maps?.["11"] || it.gold?.purchasable === false) return;
        const key = plain(it.name);
        if (!itemByName.has(key)) itemByName.set(key, { id, name: it.name });
      });
      return { runes, runeByName, itemByName, itemById, spellByName, spellByKey, trees };
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function useGameData(version) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!version) return;
    let alive = true;
    load(version)
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [version]);
  return data;
}

// Acha os nomes (oficiais ou apelidos) citados num texto, na ordem em que aparecem.
function findInText(text, names, aliases) {
  const t = plain(text || "");
  const hits = [];
  const add = (needle, target) => {
    if (!target) return;
    let i = t.indexOf(needle);
    while (i > -1) {
      const before = t[i - 1];
      const after = t[i + needle.length];
      if ((!before || !/[a-z]/.test(before)) && (!after || !/[a-z]/.test(after))) hits.push([i, target]);
      i = t.indexOf(needle, i + 1);
    }
  };
  names.forEach((v, k) => add(k, v));
  Object.entries(aliases).forEach(([a, full]) => add(a, full && names.get(plain(full))));
  hits.sort((a, b) => a[0] - b[0]);
  const seen = new Set();
  return hits.map((h) => h[1]).filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}

export const itemsInText = (data, text) => (data ? findInText(text, data.itemByName, ITEM_ALIASES) : []);
export const runesInText = (data, text) => (data ? findInText(text, data.runeByName, RUNE_ALIASES) : []);
export const spellsInText = (data, text) => (data ? findInText(text, data.spellByName, SPELL_ALIASES) : []);
export const itemByName = (data, name) => data?.itemByName.get(plain(name)) || null;
export { norm };
