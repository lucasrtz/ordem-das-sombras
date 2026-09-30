import { useEffect, useState } from "react";
import build from "../../data/arena-zed.json";
import { CHAMPION } from "../config.js";
import { splashUrl, norm } from "../lib/ddragon.js";
import { RARITY, loadArena, augmentText, augmentIcon, itemText, itemIcon } from "../lib/arena.js";

const hasAny = (obj) => Object.values(obj || {}).some((l) => l?.length);

function Missing() {
  return (
    <span className="arena-missing" title="Não achei esse nome nos dados oficiais do patch atual">
      ?
    </span>
  );
}

function AugmentColumn({ tier, names, data }) {
  if (!names?.length) return null;
  return (
    <section className={`aug-col aug-${tier}`}>
      <h3 className="aug-col-title">{RARITY[tier].label}</h3>
      <ol className="aug-list">
        {names.map((n, i) => {
          const a = data?.augments.get(norm(n));
          return (
            <li key={n} className="aug">
              <span className="aug-rank">{i + 1}</span>
              {a ? <img className="aug-icon" src={augmentIcon(a)} alt="" width="44" height="44" loading="lazy" /> : data ? <Missing /> : <span className="aug-icon ph" />}
              <div className="aug-text">
                <p className="aug-name">{a?.name || n}</p>
                {a && <p className="aug-desc">{augmentText(a)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ItemRow({ name, data, version, index }) {
  const it = data?.items.get(norm(name));
  const t = it ? itemText(it) : null;
  return (
    <li className="item-row">
      {index != null && <span className="item-step">{index + 1}</span>}
      {it ? <img className="item-icon" src={itemIcon(version, it.id)} alt="" width="44" height="44" loading="lazy" /> : data ? <Missing /> : <span className="item-icon ph" />}
      <div className="item-text">
        <p className="item-name">{it?.name || name}</p>
        {t?.stats && <p className="item-stats">{t.stats}</p>}
        {t?.passives.length > 0 && <p className="item-passive">{t.passives.join(" · ")}</p>}
      </div>
    </li>
  );
}

export default function Arena({ dd }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!dd.version) return;
    loadArena(dd.version)
      .then(setData)
      .catch(() => setError(true));
  }, [dd.version]);

  const filled = hasAny(build.augments) || hasAny(build.items);

  return (
    <section className="arena">
      <div className="arena-hero" style={{ backgroundImage: `url(${splashUrl(CHAMPION.id, 0)})` }}>
        <div className="wrap arena-hero-inner">
          <p className="eyebrow">Modo Arena</p>
          <h1 className="display">
            {CHAMPION.name} na <em>Arena</em>
          </h1>
          <p className="arena-meta">
            {build.patch ? `Patch ${build.patch}` : "Patch atual"}
            {build.source ? ` · ${build.source}` : ""}
          </p>
        </div>
      </div>

      <div className="wrap page arena-body">
        {!filled && (
          <p className="note">A build de Arena do {CHAMPION.name} ainda não foi preenchida (data/arena-zed.json).</p>
        )}
        {error && <p className="note">Não consegui carregar os dados oficiais de Arena. Tente recarregar.</p>}

        {hasAny(build.augments) && (
          <section className="block arena-block">
            <h2 className="block-title">Augments, em ordem de prioridade</h2>
            <div className="aug-cols">
              {Object.keys(RARITY).map((tier) => (
                <AugmentColumn key={tier} tier={tier} names={build.augments[tier]} data={data} />
              ))}
            </div>
          </section>
        )}

        {build.items?.core?.length > 0 && (
          <section className="block arena-block">
            <h2 className="block-title">Build principal</h2>
            <ol className="item-path" aria-label="Ordem de compra">
              {build.items.core.map((n) => {
                const it = data?.items.get(norm(n));
                return (
                  <li key={n} title={it?.name || n}>
                    {it ? <img src={itemIcon(dd.version, it.id)} alt={it.name} width="52" height="52" /> : <span className="item-icon ph" />}
                  </li>
                );
              })}
            </ol>
            <ul className="item-list">
              {build.items.core.map((n, i) => (
                <ItemRow key={n} name={n} data={data} version={dd.version} index={i} />
              ))}
            </ul>
          </section>
        )}

        {build.items?.situational?.length > 0 && (
          <section className="block arena-block">
            <h2 className="block-title">Situacionais</h2>
            <ul className="item-list">
              {build.items.situational.map((n) => (
                <ItemRow key={n} name={n} data={data} version={dd.version} />
              ))}
            </ul>
          </section>
        )}

        {build.notes?.length > 0 && (
          <section className="block arena-block">
            <h2 className="block-title">Como jogar</h2>
            <ol className="tips">
              {build.notes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </section>
        )}

        <p className="fine">
          Ícones e textos dos augments: CommunityDragon. Itens: Riot Data Dragon, versão de Arena de cada item.
        </p>
      </div>
    </section>
  );
}
