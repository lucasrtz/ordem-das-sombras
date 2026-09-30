import { go } from "../lib/router.js";
import { positionIcon, splashUrl, SFX } from "../lib/ddragon.js";
import { playSfx, playHover } from "../lib/audio.js";
import { CHAMPION, CREATOR } from "../config.js";

const ROLES = [
  { id: "top", pos: "top", label: "Top", ready: false },
  { id: "mid", pos: "middle", label: "Mid", ready: true },
  { id: "adc", pos: "bottom", label: "ADC", ready: false },
];

export default function RoleSelect() {
  return (
    <section className="role-screen">
      <div className="role-bg" style={{ backgroundImage: `url(${splashUrl(CHAMPION.id, 0)})` }} aria-hidden="true" />
      <div className="wrap role-inner">
        <p className="eyebrow">{CHAMPION.name} · para o {CREATOR.name}</p>
        <h1 className="display">
          Escolhe tua <em>rota</em>
        </h1>
        <p className="lede">
          Todas as matchups do {CHAMPION.name} mid com dados do patch atual: dificuldade real, runa, feitiços e build contra
          cada campeão, e as dicas do {CREATOR.name}.
        </p>
        <div className="roles">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className="role-card"
              disabled={!r.ready}
              onPointerEnter={(e) => r.ready && e.pointerType === "mouse" && playHover(SFX.hover)}
              onClick={() => {
                playSfx(SFX.role);
                go("/" + r.id);
              }}
            >
              <img src={positionIcon(r.pos, r.ready ? "" : "disabled")} alt="" width="56" height="56" />
              <span className="role-label">{r.label}</span>
              <span className="role-status">{r.ready ? "Entrar" : "Em breve"}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
