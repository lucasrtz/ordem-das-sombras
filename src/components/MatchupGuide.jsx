import { go } from "../lib/router.js";
import { splashUrl, SFX } from "../lib/ddragon.js";
import { youtubeId } from "../lib/matchups.js";
import { playSfx } from "../lib/audio.js";
import ChampIcon from "./ChampIcon.jsx";
import { DifficultyBadge } from "./Difficulty.jsx";
import PatchStats from "./PatchStats.jsx";
import CreatorStats from "./CreatorStats.jsx";
import Setup from "./Setup.jsx";
import { CHAMPION, CREATOR } from "../config.js";

const SETUP_ORDER = ["Runa", "Feitiços", "Build"];

export default function MatchupGuide({ m, version }) {
  const fromCreator = m.setupSource === "revy";
  const setup = fromCreator && m.setup ? SETUP_ORDER.filter((k) => m.setup[k]).map((k) => [k, m.setup[k]]) : [];
  const back = () => {
    playSfx(SFX.back);
    go("/mid");
  };

  return (
    <article className="guide">
      {m.champ && (
        <div className="guide-bg" style={{ backgroundImage: `url(${splashUrl(m.champ.id)})` }} aria-hidden="true" />
      )}
      <div className="wrap guide-inner">
        <button className="btn-link" onClick={back}>
          ‹ Trocar inimigo
        </button>

        <header className="guide-head">
          <ChampIcon champ={m.champ} name={m.champion} version={version} size={84} />
          <div>
            <p className="eyebrow">{CHAMPION.name} mid vs</p>
            <h1 className="display guide-title">{m.champion}</h1>
            <div className="guide-meta">
              <span className="cls">{m.class}</span>
              <DifficultyBadge value={m.difficulty} />
            </div>
          </div>
        </header>

        <blockquote className="guide-summary">
          <p>{m.summary}</p>
          <cite>{m.difficultySource === "revy" ? `Avaliação do ${CREATOR.name}` : "Dificuldade calculada pela taxa de vitória do patch"}</cite>
        </blockquote>

        <div className="guide-grid">
          <div className="guide-main">
            {setup.length > 0 && (
              <section className="block">
                <h2 className="block-title">Setup do {CREATOR.name}</h2>
                <Setup setup={m.setup} version={version} />
              </section>
            )}

            <CreatorStats champId={m.champ?.id} version={version} />

            <PatchStats champId={m.champ?.id} setup={fromCreator ? m.setup : null} version={version} />

            <section className="block">
              <h2 className="block-title">Na lane</h2>
              {m.laneTips.length > 0 ? (
                <ol className="tips">
                  {m.laneTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              ) : (
                <p className="note">O {CREATOR.name} ainda não escreveu as dicas desse confronto. Por enquanto, use os dados do patch acima.</p>
              )}
            </section>
          </div>

          <aside className="block guide-videos">
            <h2 className="block-title">Vídeos do {CREATOR.name}</h2>
            <ul className="videos">
              {m.sources.map((s) => {
                const id = youtubeId(s.url);
                return (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="video">
                      {id && <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" width="320" height="180" />}
                      <span className="video-title">{s.title}</span>
                      <span className="video-cta">Assistir no YouTube ↗</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            {m.sources.length === 0 && (
              <p className="fine">
                Ainda sem vídeo desse confronto. Acompanhe o {CREATOR.name}:{" "}
                {CREATOR.channels.map((c, i) => (
                  <span key={c.url}>
                    {i > 0 && " · "}
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </aside>
        </div>

        <div className="guide-foot">
          <button className="btn-ghost" onClick={back}>
            ‹ Escolher outro inimigo
          </button>
        </div>
      </div>
    </article>
  );
}
