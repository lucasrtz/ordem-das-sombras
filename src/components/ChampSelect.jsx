import { useMemo } from "react";
import { go } from "../lib/router.js";
import { CLASSES, DIFFICULTY } from "../lib/matchups.js";
import { splashUrl, positionIcon, SFX } from "../lib/ddragon.js";
import { CHAMPION, CREATOR } from "../config.js";
import { playSfx, playHover, playChampionVoice } from "../lib/audio.js";
import ChampIcon from "./ChampIcon.jsx";
import { Pips, DifficultyBadge } from "./Difficulty.jsx";

const hover = (e) => e.pointerType === "mouse" && playHover(SFX.hover);
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function ChampSelect({ matchups, version, selected, setSelected, filters, setFilters }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const list = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const r = matchups.filter(
      (m) =>
        (!q || m.champion.toLowerCase().includes(q)) &&
        (!filters.cls.length || filters.cls.includes(m.class)) &&
        (!filters.tiers.length || filters.tiers.includes(m.difficulty)) &&
        (!filters.guide || !m.onlyTierList)
    );
    const az = (a, b) => a.champion.localeCompare(b.champion);
    if (filters.sort === "hard") r.sort((a, b) => b.difficulty - a.difficulty || az(a, b));
    else if (filters.sort === "easy") r.sort((a, b) => a.difficulty - b.difficulty || az(a, b));
    else r.sort(az);
    return r;
  }, [matchups, filters]);

  const sel = matchups.find((m) => m.slug === selected) || null;

  const pick = (m) => {
    setSelected(m.slug);
    playSfx(SFX.click);
    playChampionVoice(m.champ?.key);
  };
  const random = () => {
    const pool = list.filter((m) => m.slug !== selected);
    if (!pool.length) return;
    pick(pool[Math.floor(Math.random() * pool.length)]);
  };
  const lockIn = () => {
    if (!sel) return;
    playSfx(SFX.lockIn);
    go("/mid/" + sel.slug);
  };

  const anyFilter = filters.q || filters.cls.length || filters.tiers.length || filters.guide;

  return (
    <section className="cs">
      <div className="cs-head wrap">
        <div>
          <p className="eyebrow">
            <img src={positionIcon("middle")} alt="" width="18" height="18" /> Mid · {CHAMPION.name}
          </p>
          <h1 className="display">
            Escolhe teu <em>inimigo</em>
          </h1>
        </div>
        <button className="btn-link" onClick={() => go("/")}>
          ‹ Trocar rota
        </button>
      </div>

      <div className="cs-body wrap">
        <div className="cs-left">
          <div className="filters">
            <input
              className="search"
              type="search"
              placeholder="Buscar campeão…"
              aria-label="Buscar campeão"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
            <div className="chips" role="group" aria-label="Classe">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={filters.cls.includes(c)}
                  onClick={() => set({ cls: toggle(filters.cls, c) })}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="filter-row">
              <div className="tier-filter" role="group" aria-label="Dificuldade">
                <span className="lbl">Dificuldade</span>
                {[1, 2, 3, 4, 5].map((t) => (
                  <button
                    key={t}
                    className={`tf t${t}`}
                    aria-pressed={filters.tiers.includes(t)}
                    title={DIFFICULTY[t]}
                    onClick={() => set({ tiers: toggle(filters.tiers, t) })}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="check">
                <input type="checkbox" checked={filters.guide} onChange={(e) => set({ guide: e.target.checked })} />
                só com dicas do {CREATOR.name}
              </label>
              <select value={filters.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Ordenar">
                <option value="az">A → Z</option>
                <option value="hard">Mais difícil primeiro</option>
                <option value="easy">Mais fácil primeiro</option>
              </select>
              <span className="count">
                {list.length}/{matchups.length}
              </span>
              {anyFilter ? (
                <button className="btn-link small" onClick={() => set({ q: "", cls: [], tiers: [], guide: false })}>
                  limpar
                </button>
              ) : null}
            </div>
          </div>

          {list.length ? (
            <ul className="grid" aria-label="Campeões">
              {list.map((m) => (
                <li key={m.slug}>
                  <button
                    className="tile"
                    aria-pressed={m.slug === selected}
                    onPointerEnter={hover}
                    onClick={() => pick(m)}
                    onDoubleClick={() => {
                      playSfx(SFX.lockIn);
                      go("/mid/" + m.slug);
                    }}
                    title={`${m.champion} · ${DIFFICULTY[m.difficulty]}`}
                  >
                    <ChampIcon champ={m.champ} name={m.champion} version={version} size={64} />
                    <span className="tile-name">{m.champion}</span>
                    <Pips value={m.difficulty} />
                    {!m.onlyTierList && (
                      <span className="tl-tag" title={`Tem dicas do ${CREATOR.name}`}>
                        {CREATOR.name.slice(0, 1)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nenhum campeão com esses filtros.</p>
          )}
        </div>

        <aside className={`cs-preview ${sel ? "has" : ""}`} aria-live="polite">
          {sel ? (
            <>
              {sel.champ && (
                <div
                  className="preview-splash"
                  key={sel.slug}
                  style={{ backgroundImage: `url(${splashUrl(sel.champ.id)})` }}
                  aria-hidden="true"
                />
              )}
              <div className="preview-body">
                <span className="preview-mini">
                  <ChampIcon champ={sel.champ} name={sel.champion} version={version} size={44} />
                </span>
                <div className="preview-text">
                  <p className="cls">{sel.class}</p>
                  <h2>{sel.champion}</h2>
                  <DifficultyBadge value={sel.difficulty} />
                  <p className="preview-summary">{sel.summary}</p>
                  {sel.onlyTierList && <p className="preview-note">Só dados do patch; dicas do {CREATOR.name} em breve.</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="preview-empty">
              <p className="cls">Nenhum inimigo selecionado</p>
              <p>Clique num campeão pra ver o resumo. Dê LOCK IN pra abrir o guia.</p>
            </div>
          )}
          <div className="preview-actions">
            <button className="btn-ghost btn-random" onClick={random} onPointerEnter={hover} aria-label="Aleatório">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
              <span className="btn-random-label">Aleatório</span>
            </button>
            <button
              className="btn-lockin"
              disabled={!sel}
              onClick={lockIn}
              onPointerEnter={(e) => sel && e.pointerType === "mouse" && playHover(SFX.lockHover)}
            >
              Lock in
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
