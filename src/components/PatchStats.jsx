import { STATS, MIN_SAMPLE, pct, platformsLabel, mentions } from "../lib/stats.js";
import { itemIcon } from "../lib/arena.js";
import { useGameData, runeIcon, spellIconUrl } from "../lib/gamedata.js";
import { RunePage, ItemPath } from "./Loadout.jsx";
import { CHAMPION, CREATOR } from "../config.js";

function Compare({ ok }) {
  if (ok == null) return null;
  return <span className={`cmp ${ok ? "same" : "diff"}`}>{ok ? `igual ao setup do ${CREATOR.name}` : `diferente do setup do ${CREATOR.name}`}</span>;
}

export function Row({ label, entries, total, compareWith, icons, version, iconsFor }) {
  if (!entries?.length) return null;
  const first = entries[0];
  const ok = compareWith ? mentions(compareWith, first.name.split(" + ").pop()) && mentions(compareWith, first.name.split(" + ")[0]) : null;
  return (
    <div className="ps-row">
      <dt>{label}</dt>
      <dd>
        <ul className={icons || iconsFor ? "ps-icons" : "ps-list"}>
          {entries.map((e) => (
            <li key={e.key} title={`${e.name}: ${e.games} partidas, ${pct(e.wins, e.games)}% de vitória`}>
              {icons && <img src={itemIcon(version, e.key)} alt="" width="32" height="32" loading="lazy" />}
              {iconsFor?.(e).map((src) => <img key={src} className="round" src={src} alt="" width="32" height="32" loading="lazy" />)}
              <span className="ps-name">{e.name}</span>
              <span className="ps-num">
                {pct(e.games, total)}% · {pct(e.wins, e.games)}% vit.
              </span>
            </li>
          ))}
        </ul>
        {compareWith != null && <Compare ok={ok} />}
      </dd>
    </div>
  );
}

export default function PatchStats({ champId, setup, version }) {
  const data = useGameData(version);
  if (!STATS) return null;
  const runeIcons = (e) => {
    const r = data?.runes.get(Number(e.key));
    return r ? [runeIcon(r.icon)] : [];
  };
  const spellIcons = (e) =>
    e.key
      .split("+")
      .map((k) => data?.spellByKey.get(k))
      .filter(Boolean)
      .map((s) => spellIconUrl(version, s.id));
  const s = champId ? STATS.vs[champId] : null;
  const scope = `${STATS.tier} · ${platformsLabel(STATS.platforms)} · últimos ${STATS.days} dias`;

  return (
    <section className="block patch-stats">
      <h2 className="block-title">No patch {STATS.patch}</h2>
      {!s ? (
        <p className="fine">Nenhuma partida de {CHAMPION.name} mid contra esse campeão na coleta atual ({scope}).</p>
      ) : (
        <>
          <p className="ps-head">
            <strong>{s.games}</strong> {s.games === 1 ? "partida" : "partidas"} · <strong>{pct(s.wins, s.games)}%</strong> de vitória
            <span className="ps-scope">{scope}</span>
          </p>
          {s.games < MIN_SAMPLE && <p className="note">Amostra pequena: use só como referência.</p>}
          {s.page && (
            <div className="ps-feature">
              <h3>
                Página de runas mais comum{" "}
                <span className="ps-num">
                  pedra angular em {pct(s.page.keystoneGames, s.page.games)}% das partidas; em cada linha, a escolha mais usada
                </span>
              </h3>
              <RunePage data={data} runeIds={s.page.runes} shards={s.page.shards} />
            </div>
          )}
          {s.order?.items?.length > 0 && (
            <div className="ps-feature">
              <h3>
                Ordem de compra mais comum{" "}
                <span className="ps-num">
                  {s.order.firstTwoGames >= 3
                    ? `os 2 primeiros itens lendários nessa ordem em ${pct(s.order.firstTwoGames, s.order.games)}% das partidas · ${pct(s.order.firstTwoWins, s.order.firstTwoGames)}% vit.`
                    : "poucas partidas com essa ordem exata: use como referência"}
                </span>
              </h3>
              <ItemPath items={s.order.items.map((id) => ({ id, name: data?.itemById?.get(id) || "" }))} version={version} />
            </div>
          )}
          <dl className="ps">
            <Row label="Runa" entries={s.keystones} total={s.games} iconsFor={runeIcons} compareWith={setup?.Runa ? setup.Runa : null} />
            <Row label="Secundária" entries={s.secondary} total={s.games} iconsFor={runeIcons} />
            <Row label="Feitiços" entries={s.spells} total={s.games} iconsFor={spellIcons} compareWith={setup?.["Feitiços"] ?? null} />
            <Row label="Mais comprados" entries={s.items.slice(0, 4)} total={s.games} icons version={version} />
            <Row label="Botas" entries={s.boots.slice(0, 2)} total={s.games} icons version={version} />
          </dl>
        </>
      )}
      <p className="fine">
        Estatística própria, calculada com a API oficial da Riot (partidas ranqueadas solo/duo, só números agregados). A % à
        esquerda é quanto é usado; "vit." é a taxa de vitória com aquela escolha. Itens contados no fim da partida.
      </p>
    </section>
  );
}
