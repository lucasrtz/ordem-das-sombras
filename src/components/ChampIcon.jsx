import { useState } from "react";
import { iconUrl } from "../lib/ddragon.js";
import { initials } from "../lib/matchups.js";

// Ícone do Data Dragon, com iniciais enquanto carrega ou se falhar.
export default function ChampIcon({ champ, name, version, size = 64 }) {
  const [failed, setFailed] = useState(false);
  if (!champ || !version || failed)
    return (
      <span className="champ-icon fallback" style={{ width: size, height: size }} aria-hidden="true">
        {initials(name)}
      </span>
    );
  return (
    <span className="champ-icon" style={{ width: size, height: size }}>
      <img src={iconUrl(version, champ.id)} alt="" loading="lazy" width={size} height={size} onError={() => setFailed(true)} />
    </span>
  );
}
