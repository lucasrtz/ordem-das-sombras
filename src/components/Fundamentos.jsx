import { STATS, pct, platformsLabel } from "../lib/stats.js";
import { CREATOR_FUNDAMENTOS } from "../lib/matchups.js";
import { itemIcon } from "../lib/arena.js";
import { CHAMPION, CREATOR } from "../config.js";
import CreatorStats from "./CreatorStats.jsx";
import { RunePage, ItemPath } from "./Loadout.jsx";
import { useGameData } from "../lib/gamedata.js";

function StatList({ title, entries, total, version, icons }) {
  if (!entries?.length) return null;
  return (
    <div className="fund-stat">
      <h3>{title}</h3>
      <ul className={icons ? "ps-icons" : "ps-list"}>
        {entries.map((e) => (
          <li key={e.key} title={`${e.games} partidas, ${pct(e.wins, e.games)}% de vitória`}>
            {icons && <img src={itemIcon(version, e.key)} alt="" width="32" height="32" loading="lazy" />}
            <span className="ps-name">{e.name}</span>
            <span className="ps-num">
              {pct(e.games, total)}% · {pct(e.wins, e.games)}% vit.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Fundamentos({ version }) {
  const data = useGameData(version);
  const o = STATS?.overall;
  return (
    <section className="wrap page">
      <p className="eyebrow">O básico do {CHAMPION.name} mid</p>
      <h1 className="display">Fundamentos</h1>

      {CREATOR_FUNDAMENTOS.length > 0 && (
        <div className="fund">
          {CREATOR_FUNDAMENTOS.map((card) => (
            <section key={card.title} className="card">
              <h2 className="card-title">{card.title}</h2>
              <dl className="card-list">
                {(card.items || []).map(([dt, dd]) => (
                  <div key={dt}>
                    <dt>{dt}</dt>
                    <dd>{dd}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      <div className="fund-patch">
        <CreatorStats version={version} />
      </div>

      {o ? (
        <section className="block fund-patch">
          <h2 className="block-title">O que funciona no patch {STATS.patch}</h2>
          <p className="ps-head">
            <strong>{o.games}</strong> partidas de {CHAMPION.name} mid · <strong>{pct(o.wins, o.games)}%</strong> de vitória
            <span className="ps-scope">
              {STATS.tier} · {platformsLabel(STATS.platforms)} · últimos {STATS.days} dias
            </span>
          </p>
          {o.page && (
            <div className="ps-feature">
              <h3>
                Página de runas mais comum{" "}
                <span className="ps-num">pedra angular em {pct(o.page.keystoneGames, o.page.games)}% das partidas</span>
              </h3>
              <RunePage data={data} runeIds={o.page.runes} shards={o.page.shards} />
            </div>
          )}
          {o.order?.items?.length > 0 && (
            <div className="ps-feature">
              <h3>Ordem de compra mais comum</h3>
              <ItemPath items={o.order.items.map((id) => ({ id, name: data?.itemById?.get(id) || "" }))} version={version} />
            </div>
          )}
          <div className="fund-stats">
            <StatList title="Runa principal" entries={o.keystones} total={o.games} />
            <StatList title="Árvore secundária" entries={o.secondary} total={o.games} />
            <StatList title="Feitiços" entries={o.spells} total={o.games} />
            <StatList title="Itens mais comprados" entries={o.items} total={o.games} version={version} icons />
            <StatList title="Botas" entries={o.boots} total={o.games} version={version} icons />
          </div>
          <p className="fine">
            A % à esquerda é quanto é usado; "vit." é a taxa de vitória com aquela escolha. Estatística própria com a API
            oficial da Riot, só números agregados.
          </p>
        </section>
      ) : (
        <p className="note">Os dados do patch ainda não foram coletados (npm run stats).</p>
      )}

      {CREATOR_FUNDAMENTOS.length === 0 && (
        <p className="fine">Os fundamentos do {CREATOR.name} (runas, trocas, combos) entram aqui quando ele escrever.</p>
      )}
    </section>
  );
}
