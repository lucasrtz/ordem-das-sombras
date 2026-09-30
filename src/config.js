// Configuração do site. Edite aqui antes de publicar.

// Campeão do site (id do Data Dragon) e nome do site.
export const CHAMPION = { id: "Zed", name: "Zed", title: "o Mestre das Sombras" };
export const SITE_NAME = ["Ordem", "das", "Sombras"]; // a palavra do meio aparece em destaque no logo

// Criador de conteúdo creditado no site.
export const CREATOR = {
  name: "Revy",
  channels: [
    { label: "twitch.tv/revy", url: "https://www.twitch.tv/revy" },
    { label: "YouTube @seshrevy", url: "https://www.youtube.com/@seshrevy" },
  ],
};

// Apoio via Pix: desligado até o Revy passar uma CHAVE ALEATÓRIA dele.
// ATENÇÃO: a política de fan projects da Riot (riotgames.com/en/legal) proíbe projetos que
// "crowdsource funding" sem licença. Confirme antes de ligar em produção.
export const PIX_ENABLED = false;
export const PIX_KEY = "";
export const PIX_AMOUNTS = [5, 10, 20];
export const PIX_NAME = "ORDEM DAS SOMBRAS"; // até 25 caracteres, sem acento
export const PIX_CITY = "SAO PAULO"; // até 15 caracteres, sem acento
