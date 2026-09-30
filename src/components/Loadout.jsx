// Peças visuais de build: sequência de itens, feitiços e página de runas.
import { Fragment } from "react";
import { runeIcon, itemIconUrl, spellIconUrl, SHARDS, SHARD_ROWS } from "../lib/gamedata.js";

// Itens em ordem de compra: ícones numerados, com setas entre eles.
export function ItemPath({ items, version, size = 44 }) {
  if (!items?.length || !version) return null;
  return (
    <ol className="lo-path" aria-label="Ordem de compra">
      {items.map((it, i) => (
        <Fragment key={it.id + "-" + i}>
          {i > 0 && (
            <li className="lo-arrow" aria-hidden="true">
              <svg viewBox="0 0 12 12" width="12" height="12">
                <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </li>
          )}
          <li className="lo-item" title={it.name}>
            <span className="lo-num">{i + 1}</span>
            <img src={itemIconUrl(version, it.id)} alt={it.name} width={size} height={size} loading="lazy" />
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

export function SpellIcons({ spells, version, size = 36 }) {
  if (!spells?.length || !version) return null;
  return (
    <ul className="lo-spells">
      {spells.map((s) => (
        <li key={s.id} title={s.name}>
          <img src={spellIconUrl(version, s.id)} alt="" width={size} height={size} loading="lazy" />
          <span>{s.name}</span>
        </li>
      ))}
    </ul>
  );
}

function RuneTree({ tree, selected, label, skipKeystones, runes }) {
  const slots = skipKeystones ? tree.slots.slice(1) : tree.slots;
  return (
    <div className="lo-tree">
      <div className="lo-tree-head">
        <img src={runeIcon(tree.icon)} alt="" width="24" height="24" />
        <div>
          <span className="lo-tree-label">{label}</span>
          <span className="lo-tree-name">{tree.name}</span>
        </div>
      </div>
      {slots.map((row, r) => (
        <div key={r} className={`lo-row ${!skipKeystones && r === 0 ? "keystones" : ""}`}>
          {row.map((id) => (
            <RuneDot key={id} rune={runes.get(id)} on={selected.has(id)} big={!skipKeystones && r === 0} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RuneDot({ rune: r, on, big }) {
  if (!r) return null;
  const size = big ? 44 : 30;
  return (
    <span className={`lo-rune ${on ? "on" : ""} ${big ? "big" : ""}`} title={r.name}>
      <img src={runeIcon(r.icon)} alt={on ? r.name : ""} width={size} height={size} loading="lazy" />
    </span>
  );
}

// Página de runas a partir de uma lista de ids (runas escolhidas) e, opcionalmente, 3 fragmentos.
// A árvore primária é a da pedra angular; a secundária é a outra árvore que aparecer.
export function RunePage({ data, runeIds, shards }) {
  if (!data || !runeIds?.length) return null;
  const picked = runeIds.map((id) => data.runes.get(Number(id))).filter((r) => r && !r.isTree);
  if (!picked.length) return null;
  const keystone = picked.find((r) => r.tree.slots[0].includes(r.id));
  const primary = (keystone || picked[0]).tree;
  const secondary = picked.find((r) => r.tree.id !== primary.id)?.tree;
  const selected = new Set(picked.map((r) => r.id));

  return (
    <div className="lo-runes">
      <RuneTree tree={primary} selected={selected} label="Árvore primária" runes={data.runes} />
      {secondary && <RuneTree tree={secondary} selected={selected} label="Árvore secundária" skipKeystones runes={data.runes} />}
      {shards?.length === 3 && (
        <div className="lo-tree lo-shards">
          <div className="lo-tree-head">
            <span className="lo-tree-label">Fragmentos</span>
          </div>
          {SHARD_ROWS.map((row, r) => (
            <div key={r} className="lo-row">
              {row.map((id, c) => (
                <span key={c} className={`lo-shard ${Number(shards[r]) === id ? "on" : ""}`} title={SHARDS[id].name}>
                  <img src={SHARDS[id].icon} alt={Number(shards[r]) === id ? SHARDS[id].name : ""} width="20" height="20" loading="lazy" />
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
