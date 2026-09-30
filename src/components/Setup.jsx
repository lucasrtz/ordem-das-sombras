import { useGameData, runesInText, spellsInText, itemsInText } from "../lib/gamedata.js";
import { RunePage, SpellIcons, ItemPath } from "./Loadout.jsx";

const plain = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const FILLER = new Set(["ou", "e", "de", "com", "primeiro", "rush"]);
const ALIASES = ["ghost", "ignite", "aery", "rabadon", "zhonya", "rocketbelt", "protobelt", "lacre", "apice", "vazio", "banshee", "mejai", "liandry", "codex", "mercurio", "bota cdr", "ionianas", "bota de velocidade", "bota que pinica", "criafendas"];

// O texto original só aparece se disser algo além dos nomes já mostrados em ícone.
function extra(text, found) {
  let t = plain(text);
  [...found.map((f) => plain(f.name)), ...ALIASES].forEach((n) => (t = t.split(n).join(" ")));
  const words = t
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w));
  return words.length > 0;
}

function SetupRow({ title, text, found, children }) {
  return (
    <div className="setup-row">
      <h3>{title}</h3>
      {found.length ? children : null}
      {(!found.length || extra(text, found)) && <p className={found.length ? "lo-caption" : ""}>{text}</p>}
    </div>
  );
}

export default function Setup({ setup, version }) {
  const data = useGameData(version);
  if (!setup) return null;
  const runes = setup.Runa ? runesInText(data, setup.Runa) : [];
  const spells = setup["Feitiços"] ? spellsInText(data, setup["Feitiços"]) : [];
  const items = setup.Build ? itemsInText(data, setup.Build) : [];

  return (
    <div className="setup-rows">
      {setup.Runa && (
        <SetupRow title="Runas" text={setup.Runa} found={runes}>
          <RunePage data={data} runeIds={runes.map((r) => r.id)} />
        </SetupRow>
      )}
      {setup["Feitiços"] && (
        <SetupRow title="Feitiços" text={setup["Feitiços"]} found={spells}>
          <SpellIcons spells={spells} version={version} />
        </SetupRow>
      )}
      {setup.Build && (
        <SetupRow title="Build" text={setup.Build} found={items}>
          <ItemPath items={items} version={version} />
        </SetupRow>
      )}
    </div>
  );
}
