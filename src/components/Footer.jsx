import { CREATOR, SITE_NAME } from "../config.js";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <p>
          Feito para o {CREATOR.name} (
          {CREATOR.channels.map((c, i) => (
            <span key={c.url}>
              {i > 0 && " e "}
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.label}
              </a>
            </span>
          ))}
          ). Dificuldade, runas e builds de cada confronto vêm de estatística própria, calculada com a API oficial da Riot
          (só números agregados). As dicas de lane, quando existem, são do {CREATOR.name}.
        </p>
        <p>
          Ícones, splashes e itens: Riot Data Dragon. Áudio do client e augments de Arena: CommunityDragon.
        </p>
        <p className="legal">
          {SITE_NAME.join(" ")} isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or
          anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated
          properties are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
