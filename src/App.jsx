import { useEffect, useMemo, useState } from "react";
import { useRoute, go } from "./lib/router.js";
import { loadChampions, norm, iconUrl, SFX } from "./lib/ddragon.js";
import { MATCHUPS } from "./lib/matchups.js";
import { playSfx, preloadSfx } from "./lib/audio.js";
import RoleSelect from "./components/RoleSelect.jsx";
import ChampSelect from "./components/ChampSelect.jsx";
import MatchupGuide from "./components/MatchupGuide.jsx";
import Fundamentos from "./components/Fundamentos.jsx";
import Arena from "./components/Arena.jsx";
import PixModal from "./components/PixModal.jsx";
import VolumeControl from "./components/VolumeControl.jsx";
import Footer from "./components/Footer.jsx";
import { PIX_ENABLED, CHAMPION, SITE_NAME } from "./config.js";

const TABS = [
  { id: "confrontos", label: "Confrontos", href: "/" },
  { id: "fundamentos", label: "Fundamentos", href: "/fundamentos" },
  { id: "arena", label: "Arena", href: "/arena" },
];

export default function App() {
  const route = useRoute();
  const [dd, setDd] = useState({ version: null, champions: [], error: false });
  const [pixOpen, setPixOpen] = useState(false);
  // Estado da seleção fica aqui para sobreviver à ida e volta do guia.
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ q: "", cls: [], tiers: [], guide: false, sort: "az" });

  useEffect(() => {
    loadChampions()
      .then((r) => setDd({ ...r, error: false }))
      .catch(() => setDd((d) => ({ ...d, error: true })));
    preloadSfx([SFX.hover, SFX.click, SFX.lockIn, SFX.lockHover]);
  }, []);

  const byName = useMemo(() => {
    const m = new Map();
    dd.champions.forEach((c) => m.set(norm(c.name), c));
    return m;
  }, [dd.champions]);

  const matchups = useMemo(
    () => MATCHUPS.map((m) => ({ ...m, champ: byName.get(m.slug) || null })),
    [byName]
  );

  const [first, second] = route;
  const tab = first === "fundamentos" ? "fundamentos" : first === "arena" ? "arena" : "confrontos";

  let view;
  if (first === "fundamentos") view = <Fundamentos version={dd.version} />;
  else if (first === "arena") view = <Arena dd={dd} />;
  else if (first === "mid" && second) {
    const m = matchups.find((x) => x.slug === second);
    view = m ? (
      <MatchupGuide m={m} version={dd.version} />
    ) : (
      <div className="wrap empty-state">
        <p>Não achei esse confronto.</p>
        <button className="btn-ghost" onClick={() => go("/mid")}>Voltar pra seleção</button>
      </div>
    );
  } else if (first === "mid")
    view = (
      <ChampSelect
        matchups={matchups}
        version={dd.version}
        selected={selected}
        setSelected={setSelected}
        filters={filters}
        setFilters={setFilters}
      />
    );
  else view = <RoleSelect />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/" aria-label={`${SITE_NAME.join(" ")}, início`}>
          {dd.version ? (
            <img src={iconUrl(dd.version, CHAMPION.id)} alt="" width="36" height="36" />
          ) : (
            <span className="brand-dot" />
          )}
          <span className="brand-name">
            {SITE_NAME[0]} <em>{SITE_NAME[1]}</em> {SITE_NAME[2]}
          </span>
        </a>
        <nav className="tabs" aria-label="Seções">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={"#" + t.href}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => playSfx(SFX.tab)}
            >
              {t.label}
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
          <VolumeControl />
          {PIX_ENABLED && (
            <button className="btn-support" onClick={() => setPixOpen(true)}>
              <span aria-hidden="true">♥</span> Apoiar
            </button>
          )}
        </div>
      </header>

      <main>{view}</main>

      <Footer />
      {pixOpen && <PixModal onClose={() => setPixOpen(false)} />}
    </div>
  );
}
