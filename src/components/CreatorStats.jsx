import { CREATOR_STATS, pct } from "../lib/stats.js";
import { CHAMPION, CREATOR } from "../config.js";
import { Row } from "./PatchStats.jsx";

// "Como o Revy joga": partidas de Zed mid das contas autorizadas por ele.
// Sem champId mostra o geral (aba Fundamentos).
export default function CreatorStats({ champId, version }) {
  if (!CREATOR_STATS) return null;
  const s = champId ? CREATOR_STATS.vs[champId] : CREATOR_STATS.overall;
  const accounts = CREATOR_STATS.accounts?.length ? ` · ${CREATOR_STATS.accounts.join(", ")}` : "";
  const scope = `Ranqueadas solo/duo · últimos ${CREATOR_STATS.days} dias${accounts}`;

  return (
    <section className="block creator-stats">
      <h2 className="block-title">Como o {CREATOR.name} joga</h2>
      {!s?.games ? (
        <p className="fine">
          O {CREATOR.name} não jogou esse confronto de {CHAMPION.name} mid no período ({scope.toLowerCase()}).
        </p>
      ) : (
        <>
          <p className="ps-head">
            <strong>{s.games}</strong> {s.games === 1 ? "partida" : "partidas"} · <strong>{pct(s.wins, s.games)}%</strong> de vitória
            <span className="ps-scope">{scope}</span>
          </p>
          {s.games < 5 && <p className="fine">Poucas partidas: mostra o que ele usou, não uma regra.</p>}
          <dl className="ps">
            <Row label="Runa" entries={s.keystones.slice(0, 2)} total={s.games} />
            <Row label="Feitiços" entries={s.spells.slice(0, 2)} total={s.games} />
            <Row label="Itens" entries={s.items.slice(0, 4)} total={s.games} icons version={version} />
            <Row label="Botas" entries={s.boots.slice(0, 1)} total={s.games} icons version={version} />
          </dl>
        </>
      )}
    </section>
  );
}
