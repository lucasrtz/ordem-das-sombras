import raw from "../../data/matchups.json";
import { norm } from "./ddragon.js";

export const DIFFICULTY = raw.difficultyScale;
export const CLASSES = ["Mago", "Assassino", "Lutador", "Tanque", "Atirador", "Suporte"];
export const PATCH = raw.patch;
export const CREATOR_FUNDAMENTOS = raw.fundamentos || [];
export const MATCHUPS = raw.matchups.map((m) => ({ ...m, slug: norm(m.champion) }));

export const youtubeId = (url) => {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
};

export const initials = (n) =>
  n
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
