import { DIFFICULTY } from "../lib/matchups.js";

export function Pips({ value }) {
  return (
    <span className={`pips t${value}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= value ? "on" : ""} />
      ))}
    </span>
  );
}

export function DifficultyBadge({ value }) {
  return (
    <span className={`diff-badge t${value}`}>
      <Pips value={value} />
      <span>
        {value}/5 · {DIFFICULTY[value]}
      </span>
    </span>
  );
}
