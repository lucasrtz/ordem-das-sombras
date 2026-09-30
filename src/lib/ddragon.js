// Riot Data Dragon: ícones, splashes e lista de campeões. CommunityDragon: áudio do client.
const DD = "https://ddragon.leagueoflegends.com";
const CD = "https://raw.communitydragon.org/latest";
const FALLBACK_VERSION = "16.19.1";
const CACHE_KEY = "pds:ddragon";

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(v) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(v));
  } catch {
    /* sem storage: tudo bem */
  }
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Retorna { version, champions: [{ id, key, name, namePt, tags }] }
export async function loadChampions() {
  const cached = readCache();
  if (cached) return cached;
  let version = FALLBACK_VERSION;
  try {
    version = (await getJSON(`${DD}/api/versions.json`))[0] || FALLBACK_VERSION;
  } catch {
    /* usa a versão fixa */
  }
  const [en, pt] = await Promise.all([
    getJSON(`${DD}/cdn/${version}/data/en_US/champion.json`),
    getJSON(`${DD}/cdn/${version}/data/pt_BR/champion.json`).catch(() => null),
  ]);
  const champions = Object.values(en.data)
    .map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      namePt: pt?.data?.[c.id]?.name || c.name,
      tags: c.tags,
    }))
    .sort((a, b) => a.namePt.localeCompare(b.namePt, "pt-BR"));
  const result = { version, champions };
  writeCache(result);
  return result;
}

export const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const iconUrl = (version, id) => `${DD}/cdn/${version}/img/champion/${id}.png`;
export const splashUrl = (id, skin = 0) => `${DD}/cdn/img/champion/splash/${id}_${skin}.jpg`;
export const loadingUrl = (id, skin = 0) => `${DD}/cdn/img/champion/loading/${id}_${skin}.jpg`;

export const chooseVoUrl = (key, locale = "pt_br") =>
  `${CD}/plugins/rcp-be-lol-game-data/global/${locale}/v1/champion-choose-vo/${key}.ogg`;

const CS_SOUNDS = `${CD}/plugins/rcp-fe-lol-champ-select/global/default/sounds`;
export const SFX = {
  hover: `${CS_SOUNDS}/sfx-uikit-grid-hover.ogg`,
  click: `${CS_SOUNDS}/sfx-uikit-grid-click.ogg`,
  lockHover: `${CS_SOUNDS}/sfx-cs-lockin-button-hover.ogg`,
  lockIn: `${CS_SOUNDS}/sfx-cs-lockin-button-click.ogg`,
  role: `${CS_SOUNDS}/sfx-cs-draft-posassign-player.ogg`,
  back: `${CS_SOUNDS}/sfx-uikit-button-arrowback-click.ogg`,
  tab: `${CS_SOUNDS}/sfx-uikit-generic-click-small.ogg`,
};

const POS = `${CD}/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions`;
export const positionIcon = (pos, state = "") =>
  `${POS}/icon-position-${pos}${state ? "-" + state : ""}.png`;
